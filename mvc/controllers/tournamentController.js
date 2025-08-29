const factory = require('./handlerFactory');
const catchAsync = require('../../utils/catchAsync');
const AppError = require('../../utils/appError');
const Tournament = require('../models/tournamentModel');
const Team = require('../models/teamModel');
const Game = require('../models/gameModel');
const Format = require('../models/formatModel');
const { v4: uuidV4 } = require('uuid');
// const stripe = require('stripe')(
// 	process.env.NODE_ENV === 'dev'
// 		? process.env.STRIPE_SECRET_TEST_KEY
// 		: process.env.STRIPE_SECRET_KEY
// );
const { freeMembership, plusMembership } = require('../../utils/settings');

exports.verifyOwnership = catchAsync(async (req, res, next) => {
	if (!res.locals.user)
		return next(new AppError('You are not logged in.', 403));

	const t = await Tournament.findById(req.params.id).populate({
		path: 'format',
	});
	if (!t) return next(new AppError('Tournament ID not found', 404));
	res.locals.tournament = t;

	res.locals.format = t.format;
	if (!res.locals.format) return next(new AppError('Invalid format', 400));

	res.locals.team = await Team.findById(t.team.toString()).populate([
		{
			path: 'managers',
			select: 'firstName lastName displayName _id',
		},
		{
			path: 'subscription',
			match: { active: true },
		},
	]);

	//make sure the user is a manager of this team
	if (!res.locals.team) return next(new AppError('Team not found', 404));
	else if (
		!res.locals.team.managers.some((m) => {
			return m._id.toString() === res.locals.user._id.toString();
		})
	) {
		return next(new AppError('You are not a manager of this team.', 403));
	}

	//todo: check the membership and expiration
	// res.locals.membership = freeMembership;
	res.locals.membership = plusMembership;
	// const subObj = res.locals.team.subscription;
	// if (subObj && !subObj.testMode) {
	// 	let stripeSub;
	// 	try {
	// 		stripeSub = await stripe.subscriptions.retrieve(subObj.subscriptionId);
	// 		if (stripeSub) {
	// 			const product = await stripe.products.retrieve(
	// 				stripeSub.items.data[0].price.product
	// 			);
	// 			res.locals.membership = {
	// 				...product.metadata,
	// 				maxLines: parseInt(product.metadata.maxLines),
	// 			};
	// 		}
	// 	} catch (err) {
	// 		console.log('Subscription could not be found');
	// 		if (subObj.name === 'Plus' && subObj.expires > Date.now()) {
	// 			res.locals.membership = {
	// 				...plusMembership,
	// 			};
	// 		} else {
	// 			res.locals.membership = {
	// 				...freeMembership,
	// 			};
	// 		}
	// 	}
	// }

	next();
});

exports.changeTeam = catchAsync(async (req, res, next) => {
	const tourney = await Tournament.findById(req.params.id);
	if (!tourney) return next(new AppError('Tournament not found', 404));

	const team = await Team.findById(req.body.id);
	if (!team) return next(new AppError('Team not found', 404));

	//if we're changing teams
	if (tourney.team !== team._id) {
		tourney.team = team._id;
		//clear the roster
		tourney.roster = [];
		tourney.markModified('team');
		tourney.markModified('roster');
		await tourney.save();

		//delete any game from this tournament
		await Game.deleteMany({
			tournament: tourney._id,
		});

		return res.status(200).json({
			status: 'success',
			message: 'Team changed. All games from this tournament team deleted.',
		});
	}

	res.status(200).json({
		status: 'success',
		message: 'No changes made',
	});
});

//add players from roster to tourney roster
exports.addPlayers = catchAsync(async (req, res, next) => {
	const tourney = await Tournament.findById(req.params.id);
	if (!tourney) return next(new AppError('Tournament not found', 404));

	const team = await Team.findById(tourney.team);
	if (!team) return next(new AppError('Team not found', 404));

	if (!Array.isArray(req.body.players))
		return next(new AppError('Invalid input', 400));

	let errors = [];
	let successes = 0;

	req.body.players.forEach((newPlayer) => {
		const teamPlayer = team.roster.find((player) => {
			return newPlayer.id === player.id;
		});
		if (!teamPlayer)
			errors.push(
				`Player ${newPlayer.firstName} ${newPlayer.lastName} not found on team roster.`
			);
		else if (
			tourney.roster.some((player) => {
				return player.id === newPlayer.id;
			})
		)
			errors.push(
				`Player ${newPlayer.firstName} ${newPlayer.lastName} is already on your tournament roster.`
			);
		else {
			tourney.roster.push(teamPlayer);
			tourney.markModified('roster');
			successes++;
		}
	});

	const data = await tourney.save();

	res.status(200).json({
		status: 'success',
		errors,
		successes,
		data,
	});
});

//remove player from tourney roster
exports.removePlayers = catchAsync(async (req, res, next) => {
	//req.body.players should be an array of IDs to remove
	if (!Array.isArray(req.body.players))
		return next(new AppError('Invalid input', 400));

	let errors = [];

	const initialLength = res.locals.tournament.roster.length;

	req.body.players.forEach((player) => {
		const teamPlayer = res.locals.tournament.roster.find((teammate) => {
			return player === teammate.id;
		});
		if (!teamPlayer)
			errors.push(
				`Player ${newPlayer.firstName} ${newPlayer.lastName} not found on tournament roster.`
			);
		res.locals.tournament.lines.forEach((l) => {
			l.players = l.players.filter((p) => {
				return p !== player;
			});
		});
	});

	tourney.roster = tourney.roster.filter((p) => {
		return req.body.players.every((toRemove) => {
			return toRemove.id !== p.id;
		});
	});

	res.locals.tournament.markModified('roster');
	res.locals.tournament.markModified('lines');

	const data = await tourney.save();
	const newLength = data.roster.length;

	res.status(200).json({
		status: 'success',
		errors,
		successes: initialLength - newLength,
		data,
	});
});

exports.modifyLine = catchAsync(async (req, res, next) => {
	/**
	 * req.body:
	 * {
	 * 	id: uuid for line (optional - if not blank, we're trying to modify a line; if blank, we're creating a new one)
	 *  name: name of line, free form
	 * 	players: [String] (player IDs; must match an ID in the roster, max total length of 7, max 4 of either gender)
	 * }
	 */
	const tournament = res.locals.tournament;
	const maxLines = res.locals.membership.maxLines;

	//verify that the membership level allows the user to set lines
	if (!req.body.id && tournament.lines.length >= maxLines)
		return next(
			new AppError(
				`Your subscription allows a total of ${maxLines} preset lines per event.`,
				400
			)
		);

	let id;
	const name = req.body.name;
	if (!req.body.id) {
		if (!name)
			return next(new AppError('You must specify the name of the line.', 400));
		else if (
			res.locals.tournament.lines.some((l) => {
				return (
					l.name.trim().toLowerCase() === req.body.name.trim().toLowerCase()
				);
			})
		)
			return next(
				new AppError(
					`That line name (${req.body.name.trim()}) is used for this tournament`,
					400
				)
			);
		id = uuidV4();
	} else {
		tournament.lines.some((l) => {
			if (l.id === req.body.id) {
				id = req.body.id;
				return true;
			}
		});
		if (!id) return next(new AppError('Line not found', 404));
	}

	//we can push a new line, and it has a valid name. Verify that each player is on the roster
	let f = 0;
	let m = 0;
	const lineSize = tournament.format.players || 7;
	if (
		!req.body.players.every((p) => {
			return tournament.roster.some((p2) => {
				if (p2.id === p.id) {
					if (res.locals.team.division === 'Mixed' && p2.gender === 'M') m++;
					else if (res.locals.team.division === 'Mixed' && p2.gender === 'F')
						f++;
					return true;
				}
			});
		})
	) {
		return next(
			new AppError(
				`Player ${p.name} was not found on the tournament roster. Please refresh your page and try again.`,
				400
			)
		);
		// }
		//verify that gender ratio (if mixed division) and total line size aren't violated
		// 2023-10-10: By request from En Sabah Nur - allow preset lines to violate gender or line size rules so that
		// managers can choose a line and then remove players
		// else if (
		// 	res.locals.team.division === 'Mixed' &&
		// 	(m > tournament.format.genderMax[0] ||
		// 		f > tournament.format.genderMax[1] ||
		// 		req.body.players.length > lineSize)
		// ) {
		// 	if (m > tournament.format.genderMax[0])
		// 		return next(
		// 			new AppError(
		// 				`There is a maximum of ${tournament.format.genderMax[0]} male-matching players on a line.`,
		// 				400
		// 			)
		// 		);
		// 	else if (f > tournament.format.genderMax[1])
		// 		return next(
		// 			new AppError(
		// 				`There is a maximum of ${tournament.format.genderMax[1]} female-matching players on a line.`,
		// 				400
		// 			)
		// 		);
		// 	else if (req.body.players.length > lineSize) {
		// 		return next(
		// 			new AppError(
		// 				`There is a maximum of ${tournament.format.players} players on a line.`,
		// 				400
		// 			)
		// 		);
		// 	}
	} else {
		//generate an ID for the line, and push it to the tournament lines. Return the line and the tournament to the user
		const data = {
			id,
			name,
			players: req.body.players.map((p) => {
				return p.id;
			}),
		};
		if (req.body.id) {
			tournament.lines = tournament.lines.map((l) => {
				if (l.id === id) {
					return data;
				} else {
					return l;
				}
			});
		} else {
			tournament.lines.push(data);
		}
		tournament.markModified('lines');
		const toReturn = await tournament.save();

		res.status(200).json({
			status: 'success',
			data,
			tournament: toReturn,
		});
	}
});

exports.deleteLine = catchAsync(async (req, res, next) => {
	res.locals.tournament.lines = res.locals.tournament.lines.filter((l) => {
		return l.id !== req.body.id;
	});
	res.locals.tournament.markModified('lines');
	const data = await res.locals.tournament.save();
	res.status(200).json({
		status: 'success',
		data,
	});
});

exports.createTournament = factory.createOne(Tournament);
exports.getTournament = factory.getOne(Tournament);
exports.getAllTournaments = factory.getAll(Tournament);
exports.updateTournament = factory.updateOne(Tournament);
exports.deleteTournament = factory.deleteOne(Tournament);
