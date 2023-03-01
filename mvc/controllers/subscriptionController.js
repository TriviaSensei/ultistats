const factory = require('./handlerFactory');
const catchAsync = require('../../utils/catchAsync');
const AppError = require('../../utils/appError');
const Subscription = require('../models/subscriptionModel');

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.createSubscription = catchAsync(async (req, res, next) => {
	console.log(req.body);
	// const subscription = await stripe.subscriptions.create({
	// });

	res.status(200).json({
		status: 'success',
		data: req.body,
	});
});
exports.getSubscription = factory.getOne(Subscription);
// exports.getAllSubscriptions = factory.getAll(Subscription);
exports.updateSubscription = factory.updateOne(Subscription);
// exports.deleteSubscription = factory.deleteOne(Subscription);
