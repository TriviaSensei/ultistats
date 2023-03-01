const mongoose = require('mongoose');
const { memberships } = require('../../utils/settings');

const subscriptionSchema = new mongoose.Schema({
	team: {
		type: mongoose.Schema.ObjectId,
		ref: 'Teams',
	},
	//stripe sub ID
	subscriptionId: String,
	type: {
		type: String,
		enum: memberships
			.filter((m) => {
				return m.cost > 0;
			})
			.map((m) => {
				return m.name;
			}),
	},
	price: Number,
	level: Number,
	startDate: Date,
	endDate: Date,
	autoRenew: Boolean,
});

const Subscriptions = mongoose.model(
	'Subscriptions',
	subscriptionSchema,
	'subscriptions'
);

module.exports = Subscriptions;
