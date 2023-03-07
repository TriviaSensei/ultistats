const AppError = require('../../utils/appError');
const catchAsync = require('../../utils/catchAsync');
const Format = require('../models/formatModel');
const Team = require('../models/teamModel');
const Game = require('../models/gameModel');
const Tournament = require('../models/tournamentModel');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const { rosterLimit } = require('../../utils/settings');

exports.handleAlert = (req, res, next) => {
	if (!req.query.alert) {
		return next();
	}
	switch (req.query.alert) {
		case 'payment-cancel':
			res.locals.alert = {
				status: 'warning',
				message: 'Payment cancelled',
				duration: 1000,
			};
			break;
		case 'payment-success':
			res.locals.alert = {
				status: 'info',
				message:
					'Payment successful. If the subscription area does not reflect your purchase, please refresh the page or come back later.',
				duration: 3000,
			};
			break;
		default:
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
	// console.log(res.locals.user);
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

	const formats = await Format.find();

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
			return p.priceData;
		})
		.sort((a, b) => {
			return a.priceData.unit_amount - b.priceData.unit_amount;
		});

	let mems = await stripe.products.list();

	let memberships = await Promise.all(
		mems.data.map(async (m) => {
			const priceData = await stripe.prices.retrieve(m.default_price);
			// console.log(m.metadata);
			return {
				...m,
				...m.metadata,
				cost: priceData.unit_amount / 100,
			};
		})
	);
	memberships = memberships.sort((a, b) => {
		return a.cost - b.cost;
	});

	// console.log(memberships);

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
		show: req.query.show,
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
			console.log(`team: ${t._id.toString()}`);
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
				msg: `You are now a manager of ${t.name} (${t.season}).`,
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
				msg: `Request from ${t.name} (${t.season}) deleted.`,
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
	console.log(gameData);
	res.status(200).render('game', {
		title: 'Enter game',
		colors: [tm.color1, tm.color2, tm.color3, tm.color4],
		endZone: (fmt.endzone / (fmt.endzone * 2 + fmt.length)).toFixed(4),
		brick: ((fmt.endzone + fmt.brick) / (fmt.endzone * 2 + fmt.length)).toFixed(
			4
		),
		ratio: ((100 * fmt.width) / (fmt.endzone * 2 + fmt.length)).toFixed(2),
		team: teamName,
		roster: game.tournament.roster.filter((p) => {
			return p.active;
		}),
		lines: game.tournament.lines,
		division,
		genderRule: game.tournament.genderRule,
		gameData,
		currentPoint:
			gameData.points.length > 0
				? gameData.points[gameData.points.length - 1]
				: undefined,
	});
});
