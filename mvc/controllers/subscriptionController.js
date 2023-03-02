const factory = require('./handlerFactory');
const catchAsync = require('../../utils/catchAsync');
const AppError = require('../../utils/appError');
const Subscription = require('../models/subscriptionModel');
const Team = require('../models/teamModel');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const createNewSubscription = (data) => {};

const upgradeSubscription = (data) => {};

const cancelMembership = (data) => {};

const resumeMembership = (data) => {};

/**
 * TODO:
 * This only creates a checkout session, as if this is a new sub.
 * Need to add logic here to do the following
 * - Upgrade a membership - user must have an active membership, and the selected one must cost more.
 *      - preview proration: https://stripe.com/docs/billing/subscriptions/prorations#preview-proration
 *      - upgrade/downgrade: https://stripe.com/docs/billing/subscriptions/upgrade-downgrade
 *      - modify the existing subscription (on Stripe) with the new product, and proration_behavior="always_invoice"
 * - Cancel a membership - user must have an active membership with this team.
 *      - modify the existing subscription (on Stripe) to not renew at end of term.
 *      - modify the database subscription to active=false
 *      - set the expiration date to the next occurrence of the createdOn date
 *  - Reinstate a membership (same user) - user must have an active=false membership with this team, that has not expired. If so...
 *      - modify the existing subscription (on Stripe) to renew at end of term.
 *      - modify the database subscription to active=true and set the expiration date year to 9999
 *  - Reinstate a membership (different user) - team must have an active=false membership that has not expired.
 *      - create a checkout session (mode="setup") to gather payment information
 *          - need a webhook to set the customer's ID
 *      - modify the existing subscription (on stripe) to renew, with the new customer
 *      - modify the database subscription to active=true and user=this user
 */

exports.createCheckoutSession = catchAsync(async (req, res, next) => {
	const product = await stripe.products.retrieve(req.body.product);
	if (!product) return next(new AppError('Product not found.', 404));

	const existingSub = await Subscription.findOne({
		team: req.params.id,
		user: res.locals.user._id,
		name: product.name,
		expires: { $gte: Date.now() },
		active: true,
	});

	if (existingSub)
		return next(
			new AppError('You already have this subscription active.', 400)
		);

	const price = await stripe.prices.retrieve(product.default_price);
	if (!price) return next(new AppError('Price for product not found', 404));

	const successUrl = `${req.protocol}://${req.get('host')}/mystuff/success/${
		req.params.id
	}/?show=subscription-info&alert=payment-success&team=${
		res.locals.team._id
	}&user=${res.locals.user._id}&name=${product.name}&price=${
		price.unit_amount
	}`;
	const cancelUrl = `${req.protocol}://${req.get('host')}/mystuff/${
		req.params.id
	}/?alert=payment-cancel`;

	// console.log(`${req.protocol}://${req.server}${req.url}`);
	const session = await stripe.checkout.sessions.create({
		success_url: successUrl,
		cancel_url: cancelUrl,
		line_items: [{ price: price.id, quantity: 1 }],
		mode: 'subscription',
		metadata: { teamId: req.params.id, teamName: res.locals.team.name },
	});

	// res.redirect(303, session.url);
	res.status(200).json({
		status: 'success',
		data: {
			url: session.url,
		},
	});
});

exports.createSubscriptionCheckout = catchAsync(async (req, res, next) => {
	//only temporary, as it is not secure
	let { team, user, name, price } = req.query;

	if (!team || !user || !name || !price) return next();

	price = parseInt(price);

	const t = await Team.findById(team);
	if (!t) return next(new AppError('Team not found', 404));

	const newSub = await Subscription.create({
		team,
		user,
		name,
		price,
		subscriptionId: '',
	});

	t.subscription = newSub._id;
	await t.save({ validateBeforeSave: false });

	res.redirect(
		`${req.originalUrl.split('?')[0]}?${
			req.originalUrl.split('?')[1].split('&')[0]
		}&${req.originalUrl.split('?')[1].split('&')[1]}`
	);
});

exports.getSubscription = factory.getOne(Subscription);
// exports.getAllSubscriptions = factory.getAll(Subscription);
exports.updateSubscription = factory.updateOne(Subscription);
// exports.deleteSubscription = factory.deleteOne(Subscription);
