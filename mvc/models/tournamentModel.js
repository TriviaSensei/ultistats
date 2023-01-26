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
	format: {
		type: mongoose.Schema.ObjectId,
		ref: 'Formats',
		required: [true, 'You must specify the tournament format.'],
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
