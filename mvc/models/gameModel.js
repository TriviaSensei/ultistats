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
		min: [0, 'Point cap must not be negative.'],
	},
	hardCap: {
		type: Number,
		default: 15,
		min: [0, 'Hard cap must not be negative.'],
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
	score: {
		type: Number,
		default: 0,
		min: 0,
	},
	oppScore: {
		type: Number,
		default: 0,
		min: 0,
	},
	period: {
		type: Number,
		default: 0,
		min: 0,
	},
	startSettings: {
		type: Object,
		default: {
			offense: undefined,
			jersey: undefined,
			genderRatio: undefined,
			genderRatioChoice: undefined,
			direction: undefined,
		},
	},
	points: {
		type: [Object],
	},
});

const Games = mongoose.model('Games', gameSchema, 'games');

module.exports = Games;
