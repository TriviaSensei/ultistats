const AppError = require('../../utils/appError');
const catchAsync = require('../../utils/catchAsync');
const Format = require('../models/formatModel');

const { rosterLimit } = require('../../utils/settings');

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
	console.log(res.locals.user);
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

	const user = await req.user.populate('teams');
	res.status(200).render('myStuff', {
		title: 'My Stuff',
		user,
		year: new Date().getFullYear(),
		rosterLimit,
		formats,
	});
});

exports.handleManagerRequest = catchAsync(async (req, res, next) => {});
