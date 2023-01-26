const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
	managers: {
		type: [mongoose.Schema.ObjectId],
		ref: 'Users',
	},
	requestedManagers: {
		type: [mongoose.Schema.ObjectId],
		ref: 'Users',
	},
	name: {
		type: String,
		required: [true, "You must specify your team's name"],
	},
	season: {
		type: Number,
		required: [true, 'You must specify your season'],
		validate: {
			validator: (val) => {
				const currentDate = new Date();
				const testDate = new Date();
				testDate.setFullYear(val);
				return testDate.getFullYear() <= currentDate.getFullYear() + 1;
			},
			message: `You must choose a year no more than 1 in the future.`,
		},
	},
	division: {
		type: String,
		enum: ['Men', 'Women', 'Mixed'],
		required: [true, "You must specify your team's division"],
	},
	color1: {
		type: String,
		default: '#ffffff',
	},
	color2: {
		type: String,
		default: '#000000',
	},
	roster: {
		type: [Object],
	},
});

const Teams = mongoose.model('Teams', teamSchema, 'teams');

module.exports = Teams;
