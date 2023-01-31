const catchAsync = require('../../utils/catchAsync');
const AppError = require('../../utils/appError');
const APIFeatures = require('../../utils/apiFeatures');
// const User = require('../models/userModel');
const Tournament = require('../models/tournamentModel');
const Team = require('../models/teamModel');
const Game = require('../models/gameModel');

//this will delete one of any document, depending on what gets passed to it.
exports.deleteOne = (Model) =>
	catchAsync(async (req, res, next) => {
		const arr = req.originalUrl.trim().split('/');
		const loc = (arr.length > 3 ? arr[3] : '').toLowerCase();

		const doc = await Model.findByIdAndDelete(req.params.id);

		if (!doc) {
			return res.status(404).json({
				status: 'fail',
				message: 'No document found with that ID.',
			});
		}

		if (loc === 'games') {
			const tourney = await Tournament.findById(doc._id);
			if (tourney) {
				tourney.games = tourney.games.filter((g) => {
					return g !== doc._id;
				});
				tourney.markModified('games');
				await tourney.save();
			}
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
			if (req.body.points) {
				return next(
					new AppError('This route is not for updating points.', 400)
				);
			}

			if (req.body.tournament) {
				const t = await Tournament.findById(req.body.tournament);
				if (!t) return next(new AppError('Tournament ID not found.', 404));

				const team = await Team.findById(t.team);
				if (!team) return next(new AppError('Team ID not found.', 404));

				if (!team.managers.includes(res.locals.user._id))
					return next(new AppError('You are not a manager of this team.', 403));

				//at this point, there is a valid new tournament, the team ID is valid, the team for the tournament is valid, and the user
				//is a manager of this team. We can make the changes to the tournament that it is currently part of, and the new one
				const game = await Model.findById(req.params.id);
				if (!game) return next(new AppError('Game ID not found', 404));

				game.cap = t.cap;
				game.hardCap = t.hardCap;
				game.winBy = t.winBy;

				const oldTourney = await Tournament.findById(game.tournament);
				if (oldTourney) {
					oldTourney.games = oldTourney.games.filter((g) => {
						return g !== game._id;
					});
					oldTourney.markModified('games');
					await oldTourney.save();
				}

				t.games.push(req.body.tournament);
				t.markModified(games);
				await t.save();
			}

			if (req.body.cap || req.body.hardCap) {
				if (req.body.cap > req.body.hardCap)
					return next(
						new AppError(
							'Hard cap must be greater than or equal to point cap',
							400
						)
					);
			}
		} else if (loc.toLowerCase() === 'tournaments') {
			if (
				req.body.team ||
				req.body.roster ||
				req.body.format ||
				req.body.games
			) {
				return next(new AppError('Invalid field.', 400));
			}
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
		} else if (loc === 'games') {
			const tourney = await Tournament.findById(req.body.tournament);
			if (!tourney) return next(new AppError('Tournament not found', 404));

			const team = await Team.findById(tourney.team);
			if (!team) return next(new AppError('Team not found', 404));
			if (!team.managers.includes(res.locals.user._id))
				return next(new AppError('You are not a manager of this team', 403));

			tourney.games.push(doc._id);
			tourney.markModified('games');
			await tourney.save();

			req.body.result = '';
			req.body.score = 0;
			req.body.oppScore = 0;
			req.body.cap = req.body.cap || tourney.cap;
			req.body.hardCap = req.body.hardCap || tourney.hardCap;
			req.body.winBy = req.body.winBy || tourney.winBy;

			if (req.body.hardCap < req.body.cap)
				return next(
					new AppError(
						'Hard cap must be greater than or equal to point cap',
						400
					)
				);

			req.body.timeouts = req.body.cap || tourney.timeouts;
			req.body.points = [];
		} else if (loc === 'tournaments') {
			if (!req.body.hardCap) req.body.hardCap = 15;
			if (!req.body.cap) req.body.cap = 15;

			if (req.body.hardCap < req.body.cap)
				return next(
					new AppError(
						'Hard cap must be greater than or equal to point cap',
						400
					)
				);
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
