const AppError = require('../../utils/appError');
const catchAsync = require('../../utils/catchAsync');
const { createToken } = require('../../utils/token');
const Format = require('../models/formatModel');
const Team = require('../models/teamModel');
const Game = require('../models/gameModel');
const User = require('../models/userModel');
const Tournament = require('../models/tournamentModel');
const stripe = require('stripe')(
	process.env.NODE_ENV === 'dev'
		? process.env.STRIPE_SECRET_TEST_KEY
		: process.env.STRIPE_SECRET_KEY
);

const { rosterLimit } = require('../../utils/settings');

exports.getAdmin = catchAsync(async (req, res, next) => {
	res.status(200).render('admin', {
		title: 'Admin',
	});
});

exports.handleAlert = (req, res, next) => {
	if (req.url.search('/success/') > 0) {
		res.locals.alert = {
			status: 'info',
			message: 'Payment successful',
			duration: 2000,
		};
	} else if (req.url.search('/cancel/') > 0) {
		res.locals.alert = {
			status: 'warning',
			message: 'Payment cancelled',
			duration: 1000,
		};
	}

	next();
};

exports.loginRedirect = catchAsync(async (req, res, next) => {
	if (!res.locals.user) {
		return res.status(200).render('login', {
			title: 'Log into your account',
			redirect: req.url,
		});
	}
	next();
});

exports.getHome = catchAsync(async (req, res, next) => {
	res.status(200).render('home', {
		title: 'Home',
		user: res.locals.user,
	});
});

exports.getLoginForm = catchAsync(async (req, res, next) => {
	if (res.locals.user) {
		return res.redirect('/mystuff');
	}
	// 1) get data for the requested tour (inc. reviews and tour guides)
	// 2) build template
	// 3) render template using data from (1)
	res.status(200).render('login', {
		title: 'Log into your account',
	});
});

exports.getForgotPasswordForm = catchAsync(async (req, res, next) => {
	res.status(200).render('forgotPassword', {
		title: 'Forgot Password',
	});
});

exports.getPasswordResetForm = catchAsync(async (req, res, next) => {
	if (!req.params.token) {
		return next(new AppError('Invalid or missing reset token', 400));
	}

	const user = await User.findOne({
		passwordResetToken: req.params.token,
		passwordResetExpires: { $gte: new Date() },
	});

	if (!user) {
		req.query.alert = {
			message: 'Invalid reset token',
			status: 'error',
			duration: 2000,
		};
		res.status(200).render('forgotPassword', {
			title: 'Forgot password',
			alert: {
				message: 'Invalid or expired reset token',
				status: 'error',
				duration: 2000,
			},
		});
	}

	res.status(200).render('passwordReset', {
		title: 'Reset your password',
		token: req.params.token,
	});
});

exports.getSignUpForm = catchAsync(async (req, res, next) => {
	if (res.locals.user) {
		return res.redirect('/mystuff');
	}
	res.status(200).render('signup', {
		title: 'Sign up for UltiStats',
	});
});

exports.confirmRegistration = catchAsync(async (req, res, next) => {
	res.status(200).render('confirmRegistration', {
		title: 'Confirm registration',
		token: req.params.token,
	});
});

exports.getAccount = (req, res) => {
	res.status(200).render('myAccount', {
		title: 'My Account',
		user: res.locals.user,
		requests:
			res.locals.user.teamRequests.length > 0
				? res.locals.user.teamRequests
				: null,
	});
};

exports.getManagerPage = catchAsync(async (req, res) => {
	if (!req.user) return res.redirect('/login');

	const formats = await Format.find({ hidden: false }).select('-hidden');

	const products = await stripe.products.list();
	const priceData = await Promise.all(
		products.data.map((p) => {
			return stripe.prices.retrieve(p.default_price);
		})
	);

	const productList = products.data
		.map((p) => {
			const pd = priceData.find((pr) => {
				return pr.id === p.default_price;
			});
			return {
				...p,
				priceData: pd,
			};
		})
		.filter((p) => {
			return p.priceData && p.active;
		})
		.sort((a, b) => {
			return a.priceData.unit_amount - b.priceData.unit_amount;
		});

	let mems = await stripe.products.list();

	let memberships = await Promise.all(
		mems.data.map(async (m) => {
			const priceData = await stripe.prices.retrieve(m.default_price);
			return {
				...m,
				...m.metadata,
				cost: priceData.unit_amount / 100,
			};
		})
	);
	memberships = memberships
		.filter((m) => m.active)
		.sort((a, b) => {
			return a.cost - b.cost;
		});

	const user = await req.user.populate('teams');
	res.status(200).render('myStuff', {
		title: 'My Stuff',
		user,
		selectedTeam: req.params.id,
		rosterLimit,
		formats,
		memberships,
		productList,
		action:
			req.url.search('/success/') > 0
				? 'success'
				: req.url.search('/cancel/') > 0
				? 'cancel'
				: undefined,
		show: req.params.id || null,
		alert: res.locals.alert,
	});
});

exports.handleManagerRequest = catchAsync(async (req, res, next) => {
	try {
		const t = await Team.findById(req.params.id);
		if (!t) {
			return res.redirect('/me');
		}

		if (req.url.startsWith('/confirmManager')) {
			t.managers.push(res.locals.user._id);
			t.requestedManagers = t.requestedManagers.filter((m) => {
				return m.toString() !== res.locals.user._id.toString();
			});
			t.markModified('managers');
			t.markModified('requestedManagers');
			await t.save({ validateBeforeSave: false });

			res.locals.user.teams.push(t._id);
			res.locals.user.teamRequests = res.locals.user.teamRequests.filter(
				(r) => {
					return r._id.toString() !== t._id.toString();
				}
			);
			res.locals.user.markModified('teams');
			res.locals.user.markModified('teamRequests');
			await res.locals.user.save({ validateBeforeSave: false });

			return res.status(200).render('handleManagerRequest', {
				title: 'Manager request',
				msg: `You are now a manager of ${t.name}.`,
			});
		} else if (req.url.startsWith('/declineManager')) {
			t.requestedManagers = t.requestedManagers.filter((m) => {
				return m.toString() !== res.locals.user._id.toString();
			});
			res.locals.user.teamRequests = res.locals.user.teamRequests.filter(
				(r) => {
					return r._id.toString() !== t._id.toString();
				}
			);

			t.markModified('requestedManagers');
			res.locals.user.markModified('teamRequests');
			await t.save({ validateBeforeSave: false });
			await res.locals.user.save({ validateBeforeSave: false });

			return res.status(200).render('handleManagerRequest', {
				title: 'Manager request',
				msg: `Request from ${t.name} deleted.`,
			});
		}

		res.status(200).render('home', {
			title: 'Home',
			user: res.locals.user,
		});
	} catch (err) {
		res.redirect('/me');
	}
});

exports.getGame = catchAsync(async (req, res, next) => {
	const tm = res.locals.team;
	const fmt = res.locals.format;

	if (!res.locals.user.settings) {
		res.locals.user.settings = {
			nameDisplay: 'initials',
		};
		res.locals.user.markModified('settings');
		await res.locals.user.save({ validateBeforeSave: false });
	}
	const game = await Game.findById(req.params.id).populate([
		{
			path: 'tournament',
			populate: {
				path: 'team',
				select: 'name division',
			},
		},
		{
			path: 'format',
			populate: 'allowPeriodEnd players periods genderMax',
		},
	]);

	const division = game?.tournament?.team?.division;
	const teamName = game?.tournament?.team?.name;
	if (!teamName) return next(new AppError('Team not found', 404));

	const gameData = {
		...game.toJSON(),
		startSettings: game.startSettings,
		tournament: undefined,
	};
	res.status(200).render('game', {
		title: 'Enter game',
		colors: [tm.color1, tm.color2, tm.color3, tm.color4],
		endZone: (fmt.endzone / (fmt.endzone * 2 + fmt.length)).toFixed(4),
		brick: ((fmt.endzone + fmt.brick) / (fmt.endzone * 2 + fmt.length)).toFixed(
			4
		),
		tickMarks: fmt.tickMarks.map((t) => {
			return ((fmt.endzone + t) / (fmt.endzone * 2 + fmt.length)).toFixed(4);
		}),
		ratio: ((100 * fmt.width) / (fmt.endzone * 2 + fmt.length)).toFixed(2),
		team: teamName,
		division,
		genderRule: game.tournament.genderRule,
		gameData: {
			...gameData,
			team: teamName,
			division,
			genderRule: game.tournament.genderRule,
			format: {
				...gameData.format,
			},
			roster: game.tournament.roster.filter((p) => {
				return p.active;
			}),
			lines: game.tournament.lines,
			_id: gameData._id,
		},
		currentPoint:
			gameData.points.length > 0
				? gameData.points[gameData.points.length - 1]
				: undefined,
		settings: res.locals.user.settings,
	});
});

exports.getContact = catchAsync(async (req, res, next) => {
	res.status(200).render('contact', {
		title: 'Contact',
		user: res.locals.user,
	});
});

exports.getHelpPage = catchAsync(async (req, res, next) => {
	res.status(200).render('help', {
		title: 'Help',
		user: res.locals.user,
	});
});

exports.getActivation = catchAsync(async (req, res, next) => {
	const user = await User.findOne({
		active: false,
		activationToken: req.params.token,
		activationTokenExpires: { $gte: Date.now() },
	});

	if (!user) {
		return res.status(200).render('activate', {
			title: 'Activate your account',
			alert: {
				status: 'error',
				message: 'Invalid or expired activation token',
				duration: 2000,
				redirect: '/login',
			},
		});
	}
	user.active = true;
	user.activationToken = undefined;
	user.activationTokenExpires = undefined;
	await user.save({ validateBeforeSave: false });
	createToken(user, req, res);

	res.status(200).render('activate', {
		title: 'Activate your account',
		alert: {
			status: 'info',
			message: 'Successfully activated account',
			duration: 1000,
			redirect: '/me',
		},
	});
});
