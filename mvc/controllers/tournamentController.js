const factory = require('./handlerFactory');
const catchAsync = require('../../utils/catchAsync');
const AppError = require('../../utils/appError');
const Tournament = require('../models/tournamentModel');
const Team = require('../models/teamModel');
const Game = require('../models/gameModel');

exports.verifyOwnership = catchAsync(async (req, res, next) => {
	if (!res.locals.user)
		return next(new AppError('You are not logged in.', 403));

	const t = await Tournament.find(req.params.id);
	if (!t) return next(new AppError('Tournament ID not found', 404));
	res.locals.tournament = t;

	res.locals.format = await Format.findById(t.format);
	if (res.locals.format) return next(new AppError('Invalid format', 400));

	res.locals.team = await Team.findById(t.team).populate({
		path: 'managers',
		select: 'firstName lastName displayName _id',
	});
	if (!res.locals.team) return next(new AppError('Team not found', 404));
	else if (
		!res.locals.team.managers.some((m) => {
			return m._id.toString() === res.locals.user._id.toString();
		})
	) {
		return next(new AppError('You are not a manager of this team.', 403));
	}

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

exports.removePlayers = catchAsync(async (req, res, next) => {
	const tourney = await Tournament.findById(req.params.id);
	if (!tourney) return next(new AppError('Tournament not found', 404));

	const team = await Team.findById(tourney.team);
	if (!team) return next(new AppError('Team not found', 404));

	if (!Array.isArray(req.body.players))
		return next(new AppError('Invalid input', 400));

	let errors = [];

	const initialLength = tourney.roster.length;

	req.body.players.forEach((player) => {
		const teamPlayer = tourney.roster.find((teammate) => {
			return player.id === teammate.id;
		});
		if (!teamPlayer)
			errors.push(
				`Player ${newPlayer.firstName} ${newPlayer.lastName} not found on tournament roster.`
			);
	});

	tourney.roster = tourney.roster.filter((p) => {
		return req.body.players.every((toRemove) => {
			return toRemove.id !== p.id;
		});
	});

	tourney.markModified('roster');
	const data = await tourney.save();
	const newLength = data.roster.length;

	res.status(200).json({
		status: 'success',
		errors,
		successes: initialLength - newLength,
		data,
	});
});

exports.createTournament = factory.createOne(Tournament);
exports.getTournament = factory.getOne(Tournament);
exports.getAllTournaments = factory.getAll(Tournament);
exports.updateTournament = factory.updateOne(Tournament);
exports.deleteTournament = factory.deleteOne(Tournament);
