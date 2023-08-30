const catchAsync = require('../../utils/catchAsync');
const AppError = require('../../utils/appError');
const APIFeatures = require('../../utils/apiFeatures');
const { v4: uuidV4 } = require('uuid');
// const User = require('../models/userModel');
const Tournament = require('../models/tournamentModel');
const Team = require('../models/teamModel');
const Game = require('../models/gameModel');
const Format = require('../models/formatModel');
const Subscription = require('../models/subscriptionModel');
const stripe = require('stripe')(
	process.env.NODE_ENV === 'dev'
		? process.env.STRIPE_SECRET_TEST_KEY
		: process.env.STRIPE_SECRET_KEY
);

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
		} else if (loc === 'tournaments') {
			const games = await Game.deleteMany({
				tournament: req.params.id,
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
			if (req.body.paymentMethod) {
				return next(
					new AppError(
						'This route is not for updating your payment method',
						400
					)
				);
			}
		} else if (loc.toLowerCase() === 'games') {
			if (req.body.points) {
				return next(
					new AppError('This route is not for updating points.', 400)
				);
			}

			if (req.body.tournament) {
				return next(
					new AppError(
						'You may not modify the tournament that a game is a part of.',
						400
					)
				);
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
			let roster =
				undefined || (await Tournament.findById(req.params.id)).roster;

			if (req.body.lines) {
				req.body.lines.forEach((l) => {
					l.players = l.players.filter((p) => {
						return roster.some((p2) => {
							return p2.id === p;
						});
					});
				});
			}
		} else if (loc.toLowerCase() === 'teams') {
			if (req.body.membershipLevel || req.body.membershipExpires) {
				return next(
					new AppError(
						'This route is not for updating membership information.',
						400
					)
				);
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
			// req.body.membershipLevel = 'Free';
			req.body.managers = [res.locals.user._id];
			req.body.requestedManagers = [];
			req.body.subscription = null;
			if (!req.body.roster) req.body.roster = [];
			else {
				req.body.roster.forEach((p) => {
					p.id = uuidV4();
					p.active = true;
				});
			}
		} else if (loc === 'games') {
			if (!req.body.cap && !req.body.hardCap) {
				req.body.cap = 15;
				req.body.hardCap = 15;
			} else if (!req.body.hardCap) req.body.hardCap = req.body.cap;
			else if (!req.body.cap) req.body.cap = req.body.hardCap;

			if (req.body.hardCap < req.body.cap)
				return next(
					new AppError(
						'Hard cap must be greater than or equal to point cap',
						400
					)
				);

			req.body.points = [];
			req.body.result = '';
			req.body.period = 0;
		} else if (loc === 'tournaments') {
			req.body.roster = [];
			req.body.lines = [];
			req.body.games = [];
			//make sure the team exists...
			const team = await Team.findById(req.body.team).populate({
				path: 'managers',
				select: 'firstName lastName displayName _id',
			});
			if (!team) return next(new AppError('Team not found', 404));

			//...and that the logged in user is a manager of the team
			if (
				!team.managers.some((m) => {
					return m._id.toString() === res.locals.user._id.toString();
				})
			) {
				return next(new AppError('You are not a manager of this team.', 403));
			}

			const fmt = await Format.findById(req.body.format);
			if (!fmt) return next(new AppError('Format not found', 404));
		}

		let doc;

		if (loc === 'tournaments') {
			doc = await Model.create(req.body);
			await doc.populate({
				path: 'format',
			});
		} else {
			doc = await Model.create(req.body);
		}
		//if creating a team, the user creating it starts as the manager
		if (loc === 'teams') {
			res.locals.user.teams.push(doc._id);
			await res.locals.user.save({ validateBeforeSave: false });

			doc = await Model.findById(doc._id.toString()).populate({
				path: 'managers',
				select: 'firstName lastName displayName _id',
			});
		} else if (loc === 'games') {
			const t = await Tournament.findById(req.body.tournament);
			if (!t) return next(new AppError('Tournament not found.', 404));
			t.games.push(doc._id);
			t.markModified('games');
			await t.save();
		}

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
		let filter = { _id: req.params.id };
		let isMe;
		query = Model.find(filter);

		if (popOptions) query = query.populate(popOptions);
		let doc = await query;

		if (loc === 'teams') {
			doc = await Model.findById(req.params.id).populate([
				{
					path: 'managers',
					select: 'firstName lastName displayName _id',
				},
				{
					path: 'requestedManagers',
					select: 'firstName lastName displayName _id',
				},
				{
					path: 'subscription',
					match: { active: true },
					populate: {
						path: 'user',
						select: '_id firstName lastName',
					},
				},
			]);

			// .populate({
			// 	path: 'requestedManagers',
			// 	select: 'firstName lastName displayName _id',
			// });

			const currentSub = await Subscription.find({
				team: req.params.id,
				expires: { $gte: Date.now() },
			});

			if (currentSub.length === 0) doc.subscription = null;
			else doc.subscription = currentSub[0];

			if (
				doc &&
				!doc.managers.some((m) => {
					return m._id.toString() === res.locals.user._id.toString();
				})
			) {
				return next(new AppError('You are not a manager of this team.'));
			}

			doc.roster = doc.roster.filter((p) => {
				return p.active;
			});

			let toReturn;
			if (doc.subscription) {
				toReturn = {
					...doc.toJSON(),
					isMe:
						doc.subscription.user._id.toString() ===
						res.locals.user._id.toString(),
					currentManager: `${doc.subscription.user.firstName} ${doc.subscription.user.lastName}`,
				};
			} else {
				toReturn = doc.toJSON();
			}
			return res.status(200).json({
				status: 'success',
				data: toReturn,
			});
			// doc.managers = doc.managers.sort((a, b) => {
			// 	const a1 = a._id.toString() === res.locals.user._id.toString() ? 1 : 0;
			// 	const b1 = b._id.toString() === res.locals.user._id.toString() ? 1 : 0;
			// 	return b1 - a1;
			// });
		} else if (loc === 'tournaments') {
			let team = await Team.findById(doc[0].team._id.toString());
			if (
				!team.managers.some((m) => {
					return m.toString() === res.locals.user._id.toString();
				})
			) {
				doc = [];
			}
		} else if (loc === 'games') {
			let tourney = await Tournament.findById(doc[0].tournament._id.toString());
			let team = await Team.findById(tourney.team._id.toString());
			if (
				!team.managers.some((m) => {
					return m.toString() === res.locals.user._id.toString();
				})
			) {
				doc = [];
			}
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
