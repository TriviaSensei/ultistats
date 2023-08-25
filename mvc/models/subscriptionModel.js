const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
	team: {
		type: mongoose.Schema.ObjectId,
		ref: 'Teams',
	},
	user: {
		type: mongoose.Schema.ObjectId,
		ref: 'Users',
	},
	//stripe sub ID
	subscriptionId: String,
	name: String,
	createdAt: {
		type: Date,
		default: Date.now(),
	},
	expires: {
		type: Date,
		default: new Date().setFullYear(9999),
	},
	active: {
		type: Boolean,
		default: true,
	},
	testMode: {
		type: Boolean,
		default: false,
	},
});

const Subscriptions = mongoose.model(
	'Subscriptions',
	subscriptionSchema,
	'subscriptions'
);

module.exports = Subscriptions;
