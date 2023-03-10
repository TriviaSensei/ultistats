const mongoose = require('mongoose');

const tournamentSchema = new mongoose.Schema({
	name: {
		type: String,
		required: [true, 'You must specify the tournament name.'],
	},
	team: {
		type: mongoose.Schema.ObjectId,
		ref: 'Teams',
		required: [true, 'You must specify the team you are leading.'],
	},
	startDate: {
		type: Date,
		required: [true, 'You must specify the tournament start date.'],
	},
	endDate: {
		type: Date,
		required: [true, 'You must specify the tournament end date.'],
	},
	roster: {
		type: [Object],
	},
	lines: {
		type: [Object],
		default: [],
	},
	format: {
		type: mongoose.Schema.ObjectId,
		ref: 'Formats',
		required: [true, 'You must specify the tournament format.'],
	},
	timeouts: {
		type: Number,
		enum: [0, 1, 2, 3, 4],
		default: 4,
	},
	cap: {
		type: Number,
		default: 15,
		min: [0, 'The point cap cannot be negative'],
	},
	winBy: {
		type: Number,
		default: 1,
		enum: [1, 2],
	},
	hardCap: {
		type: Number,
		default: 15,
		min: [7, 'The minimum point cap is 7'],
	},
	genderRule: {
		type: String,
		enum: ['A', 'B', 'X'],
		default: 'A',
	},
	games: {
		type: [mongoose.Schema.ObjectId],
		ref: 'Games',
	},
});

const Tournaments = mongoose.model(
	'Tournaments',
	tournamentSchema,
	'tournaments'
);

module.exports = Tournaments;
