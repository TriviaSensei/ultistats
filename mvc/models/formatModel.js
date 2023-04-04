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
		default: 7,
	},
	genderMax: {
		type: [Number],
		default: [4, 4],
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
	//2-element array - [70,90] = offense must be ready in 70 seconds, total timeout length is 90 seconds.
	timeoutLength: {
		type: [Number],
		required: [true, 'Timeout length must be specified.'],
		validate: {
			validator: (val) => {
				return (
					val.length === 2 &&
					val.every((v) => {
						return v === Math.floor(v);
					}) &&
					val[0] <= val[1]
				);
			},
			message: 'Length of time out (in seconds) must be a positive integer.',
		},
	},
	//AUDL allows a point to end without scoring a goal if the period expires.
	allowPeriodEnd: { type: Boolean, default: false },
	roundNames: {
		type: [String],
		required: [true, 'List of round names is required'],
	},
});

const Formats = mongoose.model('Formats', formatSchema, 'formats');

module.exports = Formats;
