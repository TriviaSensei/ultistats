const mongoose = require('mongoose');

const scrimmageSchema = new mongoose.Schema({
	format: {
		type: mongoose.Schema.ObjectId,
		ref: 'Formats',
	},
	date: Date,
	team: {
		type: mongoose.Schema.ObjectId,
		ref: 'Teams',
	},
	lightRoster: [Object],
	darkRoster: [Object],
	lightScore: Number,
	darkScore: Number,
	/**
	 * {
	 *      lightScore: 0,
	 *      darkScore: 0,
	 *      offense: (light/dark),
	 *      passes: [
	 *          {
	 *              thrower, receiver, defender, x0,y0,x1,y1,result,goal
	 *          }
	 *      ]
	 * }
	 */
	points: {
		type: [Object],
	},
});

const Scrimmages = mongoose.model('Scrimmages', scrimmageSchema, 'scrimmages');

module.exports = Scrimmages;
