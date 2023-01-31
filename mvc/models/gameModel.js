const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
	tournament: {
		type: mongoose.Schema.ObjectId,
		ref: 'Tournaments',
	},
	format: {
		type: mongoose.Schema.ObjectId,
		ref: 'Formats',
	},
	cap: {
		type: Number,
		default: 15,
		min: [7, 'The minimum point cap is 7'],
	},
	hardCap: {
		type: Number,
		default: 15,
		min: [7, 'The minimum point cap is 7'],
	},
	winBy: {
		type: Number,
		default: 1,
		enum: [1, 2],
	},
	timeouts: {
		type: Number,
		enum: [0, 1, 2, 3, 4],
	},
	opponent: { type: String, default: 'Opponent' },
	round: String,
	result: {
		type: String,
		enum: ['W', 'L', 'T', ''],
	},
	score: Number,
	oppScore: Number,
	points: {
		type: [Object],
	},
});

const Games = mongoose.model('Games', gameSchema, 'games');

module.exports = Games;
