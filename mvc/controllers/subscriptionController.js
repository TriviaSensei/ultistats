const factory = require('./handlerFactory');
const catchAsync = require('../../utils/catchAsync');
const AppError = require('../../utils/appError');
const Subscription = require('../models/subscriptionModel');
const Team = require('../models/teamModel');
const User = require('../models/userModel');
const stripe = require('stripe')(
	process.env.NODE_ENV === 'dev'
		? process.env.STRIPE_SECRET_TEST_KEY
		: process.env.STRIPE_SECRET_KEY
);

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
		name: product.name,
		expires: { $gte: Date.now() },
		active: true,
	});

	if (existingSub)
		return next(new AppError('You already have an active subscription.', 400));

	const price = await stripe.prices.retrieve(product.default_price);
	if (!price) return next(new AppError('Price for product not found', 404));

	// const successUrl = `${req.protocol}://${req.get('host')}/mystuff/success/${
	// 	req.params.id
	// }/?show=subscription-info&alert=payment-success&team=${
	// 	res.locals.team._id
	// }&user=${res.locals.user._id}&name=${product.name}&price=${
	// 	price.unit_amount
	// }`;
	const successUrl = `https://${req.get('host')}/mystuff/success/${
		req.params.id
	}`;
	const cancelUrl = `https://${req.get('host')}/mystuff/cancel/${
		req.params.id
	}`;

	let session;
	if (Date.now() < new Date('December 29, 2023 00:00:00')) {
		session = await stripe.checkout.sessions.create({
			success_url: successUrl,
			cancel_url: cancelUrl,
			line_items: [{ price: price.id, quantity: 1 }],
			mode: 'subscription',
			metadata: {
				productId: product.id,
				name: product.name,
				teamId: req.params.id,
				userId: res.locals.user._id,
				userEmail: res.locals.user.email,
				teamName: res.locals.team.name,
			},
			subscription_data: {
				description: 'Free trial until 12/31/2023, then $20/year',
				trial_end: new Date('January 1, 2024 00:00:00'),
			},
		});
	} else {
		session = await stripe.checkout.sessions.create({
			success_url: successUrl,
			cancel_url: cancelUrl,
			line_items: [{ price: price.id, quantity: 1 }],
			mode: 'subscription',
			metadata: {
				productId: product.id,
				name: product.name,
				teamId: req.params.id,
				userId: res.locals.user._id,
				userEmail: res.locals.user.email,
				teamName: res.locals.team.name,
			},
		});
	}

	// res.redirect(303, session.url);
	res.status(200).json({
		status: 'success',
		data: {
			url: session.url,
		},
	});
});

const createSubscriptionCheckout = async (session) => {
	const { teamId, userEmail } = session.metadata;

	const user = await User.findOne({ email: userEmail });
	if (!user) throw new Error('User not found');

	const subscription = await stripe.subscriptions.retrieve(
		session.subscription
	);
	if (!subscription) throw new Error('Subscription not found');

	const product = await stripe.products.retrieve(subscription.plan.product);
	if (!product) throw new Error('Product not found');

	const now = Date.now();

	const newData = {
		team: teamId,
		user: user._id,
		subscriptionId: session.subscription,
		name: product.name,
		createdAt: now,
		expires:
			now < new Date('December 29, 2023 00:00:00')
				? new Date('January 1, 9999 00:00:00')
				: now.setFullYear(9999),
	};

	console.log(`------New Sub------`);
	console.log(newData);
	console.log(`-------------------`);

	const newSub = await Subscription.create(newData);

	const team = await Team.findById(teamId);
	team.subscription = newSub._id;
	await team.save();
};

exports.webhookCheckout = catchAsync(async (req, res, next) => {
	const signature = req.headers['stripe-signature'];

	let event;
	try {
		event = stripe.webhooks.constructEvent(
			req.body,
			signature,
			process.env.STRIPE_WEBHOOK_SECRET
		);
	} catch (err) {
		console.log(err);
		return res.status(400).send(`Webhook error: ${err.message}`);
	}

	console.log(`----WEBHOOK RECEIVED ${event.type}----`);
	console.log(event);

	if (event.type === 'checkout.session.completed') {
		console.log(`-----data object------`);
		console.log(event.data.object);
		try {
			createSubscriptionCheckout(event.data.object);
		} catch (err) {
			return next(new AppError(400, `Webhook error: ${err.message}`));
		}
	}
	res.status(200).json({ received: true });
});

exports.cancelSubscription = catchAsync(async (req, res, next) => {
	const team = await Team.findById(req.params.id).populate('subscription');
	if (!team) return next(new AppError('Team not found', 404));

	if (!team.subscription || !team.subscription.active)
		return next(
			new AppError('You do not have an active subscription to cancel.', 400)
		);

	const sub = await stripe.subscriptions.update(
		team.subscription.subscriptionId,
		{
			cancel_at_period_end: true,
		}
	);

	if (!sub)
		return next(
			new AppError(
				'Something went wrong updating your subscription with Stripe. Try again later or contact the site administrator.',
				500
			)
		);

	const mySub = await Subscription.findById(team.subscription._id);

	if (!mySub)
		return next(
			new AppError(
				'Something went wrong updating your subscription in the database. Try again later or contact the site administrator.',
				500
			)
		);

	mySub.active = false;

	const now = new Date();
	const d1 = new Date(mySub.expires);
	d1.setFullYear(now.getFullYear());
	if (d1 > now) mySub.expires = d1;
	else {
		d1.setFullYear(now.getFullYear() + 1);
		mySub.expires = d1;
	}

	await mySub.save();

	res.status(200).json({
		status: 'success',
		message:
			'Your subscription will cancel at the end of the billing period. All features will remain active until then.',
		data: mySub,
	});
});

exports.reactivateSubscription = catchAsync(async (req, res, next) => {
	const team = await Team.findById(req.params.id).populate('subscription');
	if (!team) return next(new AppError('Team not found', 404));

	if (!team.subscription)
		return next(new AppError('You do not have a subscription.', 400));
	else if (team.subscription.active)
		return next(new AppError('You already have an active subscription.', 400));

	const sub = await stripe.subscriptions.update(
		team.subscription.subscriptionId,
		{
			cancel_at_period_end: false,
		}
	);

	if (!sub)
		return next(
			new AppError(
				'Something went wrong updating your subscription with Stripe. Try again later or contact the site administrator.',
				500
			)
		);

	const mySub = await Subscription.findById(team.subscription._id);

	if (!mySub)
		return next(
			new AppError(
				'Something went wrong updating your subscription in the database. Try again later or contact the site administrator.',
				500
			)
		);

	mySub.active = true;
	const d1 = new Date(mySub.expires);
	d1.setFullYear(9999);
	mySub.expires = d1;
	await mySub.save();

	res.status(200).json({
		status: 'success',
		message:
			'Your subscription has been reactivated. You will be billed at the end of the billing period.',
		data: mySub,
	});
});

exports.getSubscription = factory.getOne(Subscription);
// exports.getAllSubscriptions = factory.getAll(Subscription);
exports.updateSubscription = factory.updateOne(Subscription);
// exports.deleteSubscription = factory.deleteOne(Subscription);
