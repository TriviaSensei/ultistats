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
});

const Formats = mongoose.model('Formats', formatSchema, 'formats');

module.exports = Formats;
