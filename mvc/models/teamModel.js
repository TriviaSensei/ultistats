const mongoose = require('mongoose');
const Filter = require('bad-words');
const filter = new Filter();

const noBadWords = (val) => !filter.isProfane(val);

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
		validate: {
			validator: noBadWords,
			message: 'Invalid team name - please watch your language.',
		},
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
	color3: {
		type: String,
		default: '#ffffff',
	},
	color4: {
		type: String,
		default: '#000000',
	},
	roster: {
		type: [Object],
	},
	/**
	 * Free: 
	 * - Points
	 * - Touches
	 * - Goals
	 * - Assists
	 * - Turns
	 * - D's
	 * 
	 * Basic
	 * - Yards
	 * - +/- ratio
	 * - Offensive efficiency
	 * - Defensive efficiency
	 * 
	 * Advanced
	 * - Heatmaps on field (by player and by team)
	 * 		- Where turnovers occur
	 * 		- Scoring throws
	 * 		- Touches
	 * 		- Probability of scoring on a possession if we have the disc here
	 *	- Passing grid (similar to NFL QB chart) 
			- attempts/completion pct. by net yardage (<0, 0-10, 10-20, 20-30, 30+)
	 * 		
	 */
	membershipLevel: {
		type: String,
		enum: ['Free', 'Basic', 'Advanced'],
		default: 'Free',
	},
	membershipExpires: {
		type: Date,
		default: new Date().setFullYear(9999),
	},
});

const Teams = mongoose.model('Teams', teamSchema, 'teams');

module.exports = Teams;
