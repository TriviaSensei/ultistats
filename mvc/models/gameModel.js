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
	opponent: { type: String, default: 'Opponent' },
	round: String,
	result: {
		type: String,
		enum: ['W', 'L'],
	},
	score: Number,
	oppScore: Number,
	points: {
		type: [Object],
	},
});

const Games = mongoose.model('Games', gameSchema, 'games');

module.exports = Games;
