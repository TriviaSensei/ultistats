const mongoose = require('mongoose');

const formatSchema = new mongoose.Schema({
	name: {
		type: String,
		required: [true, 'You must give your format a name.'],
	},
	length: {
		type: Number,
		required: [true, 'Field length is required.'],
	},
	width: {
		type: Number,
		required: [true, 'Field width is required.'],
	},
	endzone: {
		type: Number,
		required: [true, 'End zone length is required.'],
	},
	brick: {
		type: Number,
		required: [true, 'Brick marker is required.'],
	},
	players: {
		type: Number,
		required: [true, 'Players per team is required.'],
	},
	periods: {
		type: Number,
		default: 2,
		enum: [1, 2, 4],
		required: [true, 'Number of periods is required.'],
	},
	defaultPointCap: {
		type: Number,
		default: 15,
	},
	defaultTimeouts: {
		type: Number,
		enum: [0, 1, 2, 3, 4],
		default: 4,
	},
	roundNames: {
		type: [String],
		required: [true, 'List of round names is required'],
	},
});

const Formats = mongoose.model('Formats', formatSchema, 'formats');

module.exports = Formats;
