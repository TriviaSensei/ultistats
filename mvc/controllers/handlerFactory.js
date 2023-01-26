const catchAsync = require('../../utils/catchAsync');
const AppError = require('../../utils/appError');
const APIFeatures = require('../../utils/apiFeatures');
// const User = require('../models/userModel');

//this will delete one of any document, depending on what gets passed to it.
exports.deleteOne = (Model) =>
	catchAsync(async (req, res, next) => {
		const arr = req.originalUrl.trim().split('/');
		const loc = arr.length > 3 ? arr[3] : '';

		const doc = await Model.findByIdAndDelete(req.params.id);

		if (!doc) {
			return res.status(404).json({
				status: 'fail',
				message: 'No document found with that ID.',
			});
		}

		res.status(204).json({
			status: 'success',
			data: null,
		});
	});

exports.updateOne = (Model) =>
	catchAsync(async (req, res, next) => {
		const arr = req.originalUrl.trim().split('/');
		const loc = arr.length > 3 ? arr[3] : '';

		if (loc.toLowerCase() === 'users') {
		} else if (loc.toLowerCase() === 'games') {
		}

		const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
			new: true,
			runValidators: true,
		});
		if (!doc) {
			return next(new AppError('No document found with that ID.', 404));
		}

		res.status(200).json({
			status: 'success',
			data: doc,
		});
	});

exports.createOne = (Model) =>
	catchAsync(async (req, res, next) => {
		const arr = req.originalUrl.trim().split('/');
		const loc = (arr.length > 3 ? arr[3] : '').toLowerCase();

		if (loc === 'teams') {
			req.body.managers = [res.locals.user._id];
			req.body.requestedManagers = [];
			req.body.roster = [];
		}

		const doc = await Model.create(req.body);

		res.status(201).json({
			status: 'success',
			//envelope the new object
			data: doc,
		});
	});

exports.getOne = (Model, popOptions) =>
	catchAsync(async (req, res, next) => {
		const arr = req.originalUrl.trim().split('/');
		const loc = arr.length > 3 ? arr[3] : '';

		query = Model.find(filter);

		if (popOptions) query = query.populate(popOptions);
		const doc = await query;

		if (!doc) {
			return next(new AppError('No document found with that ID.', 404));
		}

		res.status(200).json({
			status: 'success',
			data: doc,
		});
	});

exports.getAll = (Model, popOptions) =>
	catchAsync(async (req, res, next) => {
		let filter = {};
		const arr = req.originalUrl.trim().split('/');
		const loc = arr.length > 3 ? arr[3] : '';

		if (loc === 'users') {
			req.query.sort = 'lastName';
		} else if (loc === 'games') {
		}

		let features;
		if (popOptions) {
			features = new APIFeatures(
				Model.find(filter).populate(popOptions),
				req.query
			)
				.filter()
				.sort()
				.limitFields()
				.paginate();
		} else {
			features = new APIFeatures(Model.find(filter), req.query)
				.filter()
				.sort()
				.limitFields()
				.paginate();
		}
		let doc = await features.query;
		// const tours = await Tour.find().where('duration').equals(5).where('difficulty').equals('easy');

		res.status(200).json({
			status: 'success',
			results: doc.length,
			data: doc,
		});
	});
