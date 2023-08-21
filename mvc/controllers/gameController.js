const factory = require('./handlerFactory');
// const catchAsync = require('../../utils/catchAsync');
// const AppError = require('../../utils/appError');
const Game = require('../models/gameModel');
const Tournament = require('../models/tournamentModel');
const Team = require('../models/teamModel');
const Format = require('../models/formatModel');
const catchAsync = require('../../utils/catchAsync');
const AppError = require('../../utils/appError');
const round = require('../../utils/round');
const { resolve } = require('path');

const blankPass = {
	offense: undefined,
	player: '',
	x: undefined,
	y: undefined,
	result: '',
	turnover: false,
	goal: 0,
	event: '',
	eventDesc: {
		team: 0,
		in: '',
		out: '',
	},
};

/**Testing only */
exports.clearPoints = catchAsync(async (req, res, next) => {
	const game = await Game.findById(req.params.id);
	game.points = game.points.length === 0 ? [] : [game.points[0]];
	if (game.points.length > 0) {
		game.points[0].passes = [];
		game.points[0].scored = 0;
	}
	game.score = 0;
	game.oppScore = 0;
	game.markModified('points');
	await game.save();
	return res.status(200).json({
		status: 'success',
	});
});

exports.resetPoint = catchAsync(async (req, res, next) => {
	const game = await Game.findById(req.params.id);

	if (game.points.length === 0)
		return res.status(200).json({
			status: 'success',
		});

	if (game.points.slice(-1).pop().scored === 1) game.score--;
	else if (game.points.slice(-1).pop().scored === -1) game.oppScore--;

	game.points[game.points.length - 1] = {
		...game.points[game.points.length - 1],
		scored: 0,
		passes: [],
		injuries: [],
		possession: game.points[game.points.length - 1].offense,
	};

	game.markModified('score');
	game.markModified('oppScore');
	game.markModified('points');
	await game.save();
	return res.status(200).json({
		status: 'success',
	});
});

exports.resetBeforeHalf = catchAsync(async (req, res, next) => {
	const game = await Game.findById(req.params.id);
	if (!game) return next(new AppError('Game not found', 404));

	if (game.period <= 1) {
		return res.status(200).json({
			status: 'success',
		});
	}

	game.period = 1;
	game.result = '';
	while (game.points.length > 0) {
		if (game.points.slice(-1).pop().period >= 1) {
			const popped = game.points.pop();
			if (popped.scored === 1) game.score--;
			else if (popped.scored === -1) game.oppScore--;
			if (popped.period === 1) {
				popped.passes = [];
				popped.scored = 0;
				popped.injuries = [];
				popped.endPeriod = false;
				popped.passes = [];
				game.points.push(popped);
				game.markModified('points');
				await game.save();
				break;
			}
		} else break;
	}
	return res.status(200).json({
		status: 'success',
	});
});

exports.resetAll = catchAsync(async (req, res, next) => {
	const game = await Game.findById(req.params.id);
	if (!game) return next(new AppError('Game not found', 404));

	game.points = [];
	game.score = 0;
	game.oppScore = 0;
	game.period = 1;
	game.result = '';

	game.markModified('points');
	game.markModified('score');
	game.markModified('oppScore');
	game.markModified('period');
	game.markModified('result');

	await game.save();

	res.status(200).json({
		status: 'success',
	});
});
/**End test methods */

//verify that the logged in user is able to modify this game - they must be a manager of the team playing in the tournament that contains this game.
exports.verifyOwnership = catchAsync(async (req, res, next) => {
	if (!res.locals.user)
		return next(new AppError('You are not logged in.', 403));

	res.locals.game = await Game.findById(req.params.id);
	if (!res.locals.game) return next(new AppError('Game ID not found', 404));
	const t = await Tournament.findById(res.locals.game.tournament.toString());
	if (!t) return next(new AppError('Tournament ID not found', 404));
	res.locals.tournament = t;
	const fmt = await Format.findById(t.format.toString());
	if (!fmt) return next(new AppError('Invalid format', 400));
	res.locals.format = fmt;
	const tm = await Team.findById(t.team.toString());
	if (!tm) return next(new AppError('Team ID not found', 404));
	res.locals.team = tm;

	if (!tm.managers.includes(res.locals.user._id))
		return next(new AppError('You are not a manager of this team.', 403));

	next();
});

exports.startPoint = catchAsync(async (req, res, next) => {
	if (res.locals.game.result !== '')
		return next(new AppError('This game has ended.', 400));

	const points = res.locals.game.points;

	//TODO: set up the start of a point
	if (req.body.offense === undefined)
		return next(
			new AppError(
				'You must specify if you are starting on offense or defense',
				400
			)
		);
	if (req.body.direction === undefined)
		return next(new AppError('You must specify your direction', 400));

	if (req.body.direction !== -1 && req.body.direction !== 1)
		return next(new AppError('Invalid direction specified.', 400));

	if (!req.body.lineup || !Array.isArray(req.body.lineup))
		return next(new AppError('Invalid lineup specified.', 400));

	//make sure each player in the lineup is registered to the team
	if (
		!req.body.lineup.every((p) => {
			return res.locals.team.roster.some((t) => {
				return t.id === p;
			});
		})
	)
		return next(new AppError(`Invalid player found in lineup.`, 400));

	//if it's the first point...
	if (points.length === 0) {
		res.locals.game.points.push({
			score: 0,
			oppScore: 0,
			period: 1,
			offense: req.body.offense,
			direction: req.body.direction,
			lineup: req.body.lineup,
			injuries: [],
			scored: 0,
			endPeriod: false,
			passes: req.body.passes,
		});
		res.locals.game.period = 1;
		res.locals.game.markModified('period');
		res.locals.game.markModified('points');
		const data = await res.locals.game.save();
		await data.populate([
			{
				path: 'format',
			},
			{
				path: 'tournament',
				select: 'roster',
			},
		]);

		return res.status(200).json({
			status: 'success',
			data,
		});
	}

	//if not the first point, look at the last point to initialize the information.
	const lastPoint = points[points.length - 1];

	//check if the last point is finished
	if (lastPoint.scored !== -1 && lastPoint.scored !== 1) {
		//if not, we need to be setting the lineup for this point
		if (!req.body.lineup)
			return next(new AppError('You have already started a point.', 400));
		else {
			points[points.length - 1] = {
				...lastPoint,
				...req.body,
			};
			res.locals.game.markModified('period');
			res.locals.game.markModified('points');
			const data = await res.locals.game.save();
			await data.populate([
				{
					path: 'format',
				},
				{
					path: 'tournament',
					select: 'roster',
				},
			]);
			return res.status(200).json({
				status: 'success',
				data,
			});
		}
	}

	const score = lastPoint.score + (lastPoint.scored === 1 ? 1 : 0);
	const oppScore = lastPoint.oppScore + (lastPoint.scored === -1 ? 1 : 0);

	//initialize the point:
	/**
	 * scores
	 * period - if we specify that we're starting the second half, or if we're already in the second half, or if either score is at or above halftime, we're in half 2
	 * offense/direction - specified in body
	 * lineup - players starting this point
	 * injuries - any players subbed off during the point (for any reason, injury or otherwise)
	 * 		- if this occurs, that player will be removed from "lineup". When the point ends, lineup will be whoever ended the point on the field. It is possible to re-enter
	 * 			after subbing off.
	 * scored - no one has scored this point, so we don't initialize it
	 * endPeriod - if this is the last point of the half/quarter. Always starts as false (even if the score is 7-7 and the half will end one way or another). Set to true if the half ends after the point.
	 * passes: empty array - no passes yet
	 */
	const newPeriod = lastPoint.period + (lastPoint.endPeriod ? 1 : 0);
	res.locals.game.points.push({
		score,
		oppScore,
		period: newPeriod,
		offense: req.body.offense,
		direction: req.body.direction,
		lineup: req.body.lineup,
		injuries: [],
		scored: 0,
		endPeriod: false,
		passes: req.body.passes,
	});
	res.locals.game.period = newPeriod;
	res.locals.game.markModified('period');
	res.locals.game.markModified('points');
	const data = await res.locals.game.save();
	await data.populate([
		{
			path: 'format',
		},
		{
			path: 'tournament',
			select: 'roster',
		},
	]);
	return res.status(200).json({
		status: 'success',
		data,
	});
});

exports.setLineup = catchAsync(async (req, res, next) => {
	if (res.locals.game.result !== '')
		return next(new AppError('This game has ended.', 400));

	const points = res.locals.game.points;
	const len = points.length;

	if (len === 0) return next(new AppError('No point in progress.', 400));

	if (req.body.lineup && Array.isArray(req.body.lineup)) {
		points[len - 1].lineup = req.body.lineup;
		points[len - 1].offense = req.body.offense;
		points[len - 1].direction = req.body.direction;
		res.locals.game.markModified('points');
		const data = await res.locals.game.save();
		await data.populate([
			{
				path: 'format',
			},
			{
				path: 'tournament',
				select: 'roster',
			},
		]);
		return res.status(200).json({
			status: 'success',
			data,
		});
	} else {
		return next(new AppError('No lineup or invalid lineup specified.', 400));
	}
});

/**
 * Pass:
 * {
 *  thrower: (id),
 *  receiver: (id),
 *  defender: (id),
 *  x0, y0, x1, y1,
 *  result: enum('complete','throwaway','drop','block','pickup')
 *  goal: 0 (none), 1 (for us), -1 (for them)
 *  event: if defined, then this is not a pass. Names can be 'sub', 'timeout', or 'end' (in AUDL, end of period ends a point without a goal being scored)
 * 		name: sub or timeout
 *  	in: player in ID
 *  	out: player out ID
 *  	timeout: +/- 1 (us/them)
 *
 */
//TODO: redo pass updating here gives error - no matching document

exports.setPasses = catchAsync(async (req, res, next) => {
	const fmt = res.locals.format;

	if (res.locals.game.result !== '')
		return next(new AppError('This game has ended.', 400));

	if (!req.body.passes)
		return next(new AppError('Invalid input specified.', 400));

	if (res.locals.game.points.length === 0)
		return next(new AppError('This game has not started.', 400));

	res.locals.game.points[res.locals.game.points.length - 1] = req.body;
	res.locals.game.markModified('points');

	res.locals.game.score = 0;
	res.locals.game.oppScore = 0;
	res.locals.game.period = 1;

	let periodEnds = [];
	for (var i = 0; i < res.locals.format.periods; i++) {
		const a = ((i + 1) * res.locals.game.cap) / res.locals.format.periods;
		if (a === Math.floor(a)) periodEnds.push(a);
		else periodEnds.push(Math.floor(a) + 1);
	}

	res.locals.game.points.forEach((p) => {
		if (p.scored === 1) {
			res.locals.game.score++;
			const newPeriod =
				periodEnds.findIndex((n) => {
					return n === res.locals.game.score;
				}) + 2;
			if (res.locals.game.period === newPeriod - 1 || p.endPeriod) {
				res.locals.game.period++;
				p.endPeriod = true;
			}
		} else if (p.scored === -1) {
			res.locals.game.oppScore++;
			const newPeriod =
				periodEnds.findIndex((n) => {
					return n === res.locals.game.oppScore;
				}) + 2;
			if (res.locals.game.period === newPeriod - 1 || p.endPeriod) {
				res.locals.game.period++;
				p.endPeriod = true;
			}
		}
	});

	//check for game end by point cap (cap = 0 means no cap, e.g. AUDL or PUL format)
	if (res.locals.game.cap > 0) {
		const lead = Math.max(res.locals.game.score, res.locals.game.oppScore);
		const trail = Math.min(res.locals.game.score, res.locals.game.oppScore);
		if (
			//ahead by the win-by amount and score is at least equal to the cap
			(lead >= trail + res.locals.game.winBy && lead >= res.locals.game.cap) ||
			//...or ahead at all, and we've hit the hard point cap
			(lead > trail && lead >= res.locals.game.hardCap)
		) {
			res.locals.game.result =
				res.locals.game.score > res.locals.game.oppScore
					? 'W'
					: res.locals.game.score < res.locals.game.oppScore
					? 'L'
					: 'T';
			res.locals.game.markModified('result');
		}
	}

	res.locals.game.period = Math.min(
		res.locals.game.period,
		res.locals.format.periods
	);
	res.locals.game.markModified('score');
	res.locals.game.markModified('oppScore');
	res.locals.game.markModified('period');
	await res.locals.game.save();

	res.status(200).json({
		status: 'success',
		data: req.body,
	});
});

exports.subPlayer = catchAsync(async (req, res, next) => {
	const game = res.locals.game;
	if (!game) return next(new AppError('Game ID not found', 404));
	if (game.result !== '')
		return next(new AppError('This game has ended.', 400));
	if (game.points.length === 0)
		return next(new AppError('This game has not started.', 400));

	const roster = res.locals.tournament.roster;
	if (!roster) return next(new AppError('Roster not found', 404));

	if (
		req.body.in &&
		game.points[game.points.length - 1].lineup.includes(req.body.in)
	)
		return next(new AppError('Player entering is already in the lineup.', 400));

	if (!req.body.in && !req.body.out)
		return next(
			new AppError('You must specify a player to enter or exit.', 404)
		);

	if (
		req.body.in &&
		!req.body.out &&
		game.points[game.points.length - 1].lineup.length ===
			res.locals.format.players
	)
		return next(
			new AppError('Lineup is full - you must remove a player.', 400)
		);

	//remove the player from the lineup if one was specified
	if (req.body.out) {
		game.points[game.points.length - 1] = {
			...game.points[game.points.length - 1],
			lineup: game.points[game.points.length - 1].lineup.filter((p) => {
				return p !== req.body.out;
			}),
		};
		//put the player in the injuries array for this point - they will be considered to have played the point (even though they're not in the lineup at the end)
		if (!game.points[game.points.length - 1].injuries.includes(req.body.out))
			game.points[game.points.length - 1].injuries = [
				...game.points[game.points.length - 1].injuries,
				req.body.out,
			];
	}

	//add the new player to the lineup if one was specified
	if (req.body.in) {
		const player = roster.find((p) => {
			return p.id === req.body.in;
		});
		if (!player)
			return next(new AppError('Player entering game not found.', 404));

		if (req.body.out) {
			const playerOut = roster.find((p) => {
				return p.id === req.body.out;
			});

			if (!playerOut)
				return next(new AppError('Player exiting game not found.', 404));
			if (playerOut.gender !== player.gender)
				return next(
					new AppError('Swapped players must be of same gender-matchup.'),
					400
				);
		}
		game.points[game.points.length - 1] = {
			...game.points[game.points.length - 1],
			lineup: [...game.points[game.points.length - 1].lineup, req.body.in],
		};
	}

	game.markModified('points');
	const data = await game.save();

	res.status(200).json({
		status: 'success',
		data,
	});
});

exports.returnToPoint = catchAsync(async (req, res, next) => {
	const game = res.locals.game;
	if (game.points.length === 0)
		return next(new AppError('No points in this game.', 400));

	let cp = game.points[game.points.length - 1];
	//current point has not been scored, so pop it and go back to the last point
	if (cp.scored === 0) {
		res.locals.game.points.pop();
		cp = game.points[game.points.length - 1];
		if (cp) cp.scored = 0;
	}

	if (!cp) {
		res.locals.game.markModified('score');
		res.locals.game.markModified('oppScore');
		res.locals.game.markModified('result');
		res.locals.game.markModified('points');
		const data = await res.locals.game.save();
		await data.populate({
			path: 'format',
		});
		// const data = await res.locals.game.populate({
		// 	path: 'format',
		// });
		return res.status(200).json({
			status: 'success',
			data,
		});
	}

	//figure out the period if we undid an end-period point
	if (cp && cp.endPeriod) {
		cp.endPeriod = false;
		res.locals.game.period = 1;
		res.locals.game.points.forEach((p) => {
			if (p.endPeriod) res.locals.game.period++;
		});
	}

	//if there was a result, unset it
	res.locals.game.result = '';

	//reset the score to the previous
	if (cp.scored === 1) res.locals.game.score--;
	else if (cp.scored === -1) res.locals.game.oppScore--;

	cp.scored = 0;

	if (cp.passes.length === 0)
		return next(
			new AppError('Invalid data - contact your administrator.', 400)
		);
	const lastPass = cp.passes[cp.passes.length - 1];
	lastPass.goal = 0;
	cp.passes.push({
		...blankPass,
		offense:
			(lastPass.offense && !lastPass.turnover) ||
			(!lastPass.offense && lastPass.turnover),
	});

	res.locals.game.markModified('score');
	res.locals.game.markModified('oppScore');
	res.locals.game.markModified('result');
	res.locals.game.markModified('points');
	const data = await res.locals.game.save();
	await data.populate({
		path: 'format',
	});
	// const data = await res.locals.game.populate({
	// 	path: 'format',
	// });
	res.status(200).json({
		status: 'success',
		data,
	});
});

exports.endPeriod = catchAsync(async (req, res, next) => {
	if (res.locals.game.period === res.locals.format.periods)
		return next(new AppError('You are in the last period.', 400));

	const lastPoint = res.locals.game.points[res.locals.game.points.length - 1];

	if (lastPoint.scored === 0)
		return next(new AppError('The last point has not finished.', 400));

	res.locals.game.points[res.locals.game.points.length - 1].endPeriod = true;
	res.locals.game.period++;

	res.locals.game.markModified('points');
	res.locals.game.markModified('period');
	const data = await res.locals.game.save();
	await data.populate({
		path: 'format',
	});
	res.status(200).json({
		status: 'success',
		data,
	});
});

exports.endGame = catchAsync(async (req, res, next) => {
	const game = res.locals.game;

	if (!game) return next(new AppError('Game ID not found', 404));
	if (game.result !== '')
		return next(new AppError('Game has already ended.', 400));

	if (game.score > game.oppScore) game.result = 'W';
	else if (game.score < game.oppScore) game.result = 'L';
	else game.result = 'T';

	const data = await game.save();
	res.status(200).json({
		status: 'success',
		data,
	});
});

exports.updateGame = factory.updateOne(Game);
exports.createGame = factory.createOne(Game);
exports.getGame = factory.getOne(Game);
// exports.getAllGames = factory.getAll(Game);
exports.deleteGame = factory.deleteOne(Game);
