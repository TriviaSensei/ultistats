const mongoose = require('mongoose');
const Filter = require('bad-words');
const filter = new Filter();
const { memberships } = require('../../utils/settings');

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
	 * 	Stats:
	 * 	- Points
	 * 	- Touches
	 * 	- Goals
	 * 	- Assists
	 * 	- Turns
	 * 	- D's
	 * Features:
	 *  - O and D lines for each tournament
	 * 
	 * Basic
	 * 	Stats:
	 * 	- Yards
	 * 	- +/- ratio
	 * 	- Offensive efficiency
	 * 	- Defensive efficiency
	 * Features:
	 * 	- Offense, defense, and up to 3 additional preset lines for each tournament
	 *
	 * 
	 * Plus
	 * 	Stats:
	 * 	- Heatmaps on field (by player and by team)
	 * 			- Where turnovers occur
	 * 			- Scoring throws
	 * 			- Touches
	 * 			- Probability of scoring on a possession if we have the disc here
	 *		- Passing grid (similar to NFL QB chart) 
	 			- attempts/completion pct. by net yardage (<0, 0-10, 10-20, 20-30, 30+)
		Features:
			- Offense, defense, and up to 6 additional preset lines for each tournament
	 * 		
	 */
	membership: {
		type: [mongoose.Schema.ObjectId],
		ref: 'Subscriptions',
	},
});

const Teams = mongoose.model('Teams', teamSchema, 'teams');

module.exports = Teams;
