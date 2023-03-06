const factory = require('./handlerFactory');
// const catchAsync = require('../../utils/catchAsync');
// const AppError = require('../../utils/appError');
const Game = require('../models/gameModel');
const Tournament = require('../models/tournamentModel');
const Team = require('../models/teamModel');
const Format = require('../models/formatModel');
const catchAsync = require('../../utils/catchAsync');
const AppError = require('../../utils/appError');

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
		let timeouts;
		switch (res.locals.game.timeouts) {
			case 4:
			case 3:
				timeouts = 2;
				break;
			case 2:
			case 1:
				timeouts = 1;
				break;
			default:
				timeouts = 0;
		}
		res.locals.game.points.push({
			score: 0,
			oppScore: 0,
			half: 1,
			timeouts,
			oppTimeouts: timeouts,
			offense: req.body.offense,
			direction: req.body.direction,
			lineup: req.body.lineup,
			injuries: [],
			scored: undefined,
			passes: [],
			pointer: undefined,
		});
		res.locals.game.markModified('points');
		const data = await res.locals.game.save();

		return res.status(200).json({
			status: 'success',
			data,
		});
	}

	//if not the first point, look at the last point to initialize the information.
	const lastPoint = points[points.length - 1];
	//must have finished the last point
	if (lastPoint.scored !== -1 && lastPoint.scored !== 1)
		return next(new AppError('You have not finished the last point', 400));

	const score = lastPoint.score + (lastPoint.scored === 1 ? 1 : 0);
	const oppScore = lastPoint.oppScore + (lastPoint.scored === -1 ? 1 : 0);

	//initialize the point:
	/**
	 * scores
	 * period - if we specify that we're starting the second half, or if we're already in the second half, or if either score is at or above halftime, we're in half 2
	 * offense/direction - specified in body
	 * scored - no one has scored this point, so we don't initialize it
	 * passes: empty array - no passes yet
	 * endPeriod: (boolean) this point ends the period. Automatically set at halftime (if score reaches halftime and we haven't manually ended the half due to a cap yet).
	 */
	res.locals.game.points.push({
		score,
		oppScore,
		half:
			lastPoint.half === 2 ||
			score >= res.locals.game.cap / 2 ||
			oppScore >= res.locals.game.cap / 2 ||
			req.body.half === 2
				? 2
				: 1,
		timeouts: lastPoint.timeouts,
		oppTimeouts: lastPoint.oppTimeouts,
		offense: req.body.offense,
		direction: req.body.direction,
		lineup: req.body.lineup,
		injuries: [],
		scored: undefined,
		passes: [],
		pointer: undefined,
	});
	res.locals.game.markModified('points');
	const data = await res.locals.game.save();

	return res.status(200).json({
		status: 'success',
		data,
	});
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
exports.addPass = catchAsync(async (req, res, next) => {
	if (res.locals.game.result !== '')
		return next(new AppError('This game has ended.', 400));

	console.log(req.body);
	if (!req.body.pass)
		return next(new AppError('Invalid input specified.', 400));

	if (res.locals.game.points.length === 0)
		return next(new AppError('This game has not started.', 400));

	const currentPoint =
		res.locals.game.points[res.locals.game.points.length - 1];

	let lastPass, state;
	for (var i = currentPoint.passes.length - 1; i >= 0; i--) {
		if (!currentPoint.passes[i].event) {
			lastPass = currentPoint.passes[i];
			break;
		}
	}

	//capture the current state of the disc/game before this pass
	/**
	 * -1: we are between points
	 * 0: we are on defense
	 * 1: we are on offense, but no one has the disc
	 * 2: we are on offense, in possession of the disc
	 */
	if (!lastPass) state = -1;
	//other team picking up the disc after our pull on the last pass
	else if (!lastPass.thrower && !lastPass.receiver && !lastPass.defender)
		state = 0;
	//we turned it over
	else if (lastPass.thrower && lastPass.result !== 'complete') state = 0;
	//they got stalled - they drop the disc and we need to select someone to pick it up.
	else if (!lastPass.thrower && lastPass.result === 'stall') state = 1;
	//we compelted a pass
	else if (
		lastPass.result === 'complete' ||
		(lastPass.receiver && lastPass.result === 'pickup')
	)
		state = 2;
	//we got a block, or they turned over, and we have not picked up the disc
	else if (
		(lastPass.defender && lastPass.result === 'block') ||
		(!lastPass.thrower &&
			!lastPass.receiver &&
			!lastPass.defender &&
			lastPass.result !== 'complete' &&
			lastPass.goal !== -1)
	)
		state = 1;
	//the last pass resulted in a goal - don't add another pass for this point.
	else if (lastPass.goal !== 0) {
		return next(
			new AppError(
				'A goal has already been scored and the point has ended. Use the undo feature to go back and fix data.',
				400
			)
		);
	}

	const pass = req.body.pass;

	if (pass.event) {
		//this indicates a non-play event - sub and timeout are the only ones recorded here.
		if (pass.event !== 'sub' && pass.event !== 'timeout') {
			return next(new AppError('Invalid event specified.'));
		} else if (pass.event === 'sub') {
			//make sure both halves of the substitue are valid
			if (
				!res.locals.tournament.roster.some((p) => {
					return p.id === pass.in;
				})
			) {
				return next(new AppError('Invalid player subbed in'));
			} else if (
				currentPoint.lineup.some((p) => {
					return p === pass.in;
				})
			) {
				return next(new AppError('Player is already in the lineup.'));
			}
			//Look at the current point, and see if the player being subbed out is in the lineup.
			else if (
				!res.locals.game.points[res.locals.game.points.length - 1].lineup.some(
					(p) => {
						return p === pass.out;
					}
				)
			) {
				return next(new AppError('Invalid player subbed out'));
			}

			//we're good - make the sub
			//take the player out of the lineup for this point
			currentPoint.lineup = currentPoint.lineup.filter((p) => {
				return p !== pass.out;
			});
			//put the player into the injured list - this will indicate that the player played the point, even if they don't show up in the current lineup
			currentPoint.injuries.push(pass.out);
			//put the new player into the lineup.
			currentPoint.lineup.push(pass.in);
			res.locals.game.markModified('points');
			await res.locals.game.save();

			return res.status(200).json({
				status: 'success',
				data: pass,
			});
		} else if (pass.event === 'timeout') {
			if (!pass.timeout) {
				return next(
					new AppError('You must specify which team called the timeout.', 400)
				);
			}

			/**
			 * Determine if the timeout call was valid
			 * Before point starts:
			 *      passes will be empty
			 *      either team can call a timeout
			 * We are on defense:
			 *      no receiver on last pass
			 *      only they can call a timeout
			 * We are on offense
			 *      last pass has a receiver
			 *      only we can call a timeout
			 */
			if (!lastPass) {
				if (pass.timeout !== 1 && pass.timeout !== -1)
					return next(
						new AppError('Invalid team specified for timeout call', 400)
					);
				else if (pass.timeout === 1) {
					if (currentPoint.timeouts <= 0) {
						return next(new AppError('You do not have any timeouts.', 400));
					}
					currentPoint.timeouts--;
				} else {
					if (currentPoint.oppTimeouts <= 0) {
						return next(
							new AppError('The other team does not have any timeouts.', 400)
						);
					}
					currentPoint.oppTimeouts--;
				}
			} else if (!lastPass.receiver) {
				if (pass.timeout !== -1)
					return next(
						new AppError(
							'Only the other team may call a time out right now.',
							400
						)
					);
				else if (currentPoint.oppTimeouts <= 0)
					return next(
						new AppError('The other team does not have any timeouts.', 400)
					);
				currentPoint.oppTimeouts--;
			} else {
				if (pass.timeout !== 1)
					return next(
						new AppError('Only your team may call a time out right now.', 400)
					);
				else if (currentPoint.timeouts <= 0)
					return next(new AppError('You do not have any timeouts.', 400));
				currentPoint.timeouts--;
			}

			res.locals.game.markModified('points');
			await res.locals.game.save();

			return res.status(200).json({
				status: 'success',
				data: pass,
			});
		}
	} else {
		//this is a regular pass (or a stall)
		/**
		 * We can record:
		 * - Other team picking up (just location x1,y1 and result='pickup'...no players specified)
		 * - Other team scoring (goal=-1)
		 * - Other team dropping it or throwing it away (no player IDs, result="drop","throwaway")
		 * - Us picking up, either on a turn or to start a point (receiver, x1,y1,result='pickup')
		 * - Us completing a pass (thrower, receiver, x0,y0,x1,y1, result=complete)
		 * - Us throwing it away (thrower, x0,y0,x1,y1, result=throwaway)
		 * - Us dropping it (thrower, intended receiver, x0,y0,x1,y1, result=drop)
		 * - Stall out from either team (thrower?, x0, y0, result=stall)
		 * - Us getting a D (defender, x1,y1)
		 * - Us scoring (goal = 1)
		 */
		const { thrower, receiver, defender, x0, y0, x1, y1, result, goal } =
			req.body;

		const throwerInfo = !thrower
			? undefined
			: res.locals.team.find((p) => {
					return p.id === thrower;
			  });
		const receiverInfo = !receiver
			? undefined
			: res.locals.team.find((p) => {
					return p.id === receiver;
			  });
		const defenderInfo = !defender
			? undefined
			: res.locals.team.find((p) => {
					return p.id === defender;
			  });
		if (thrower && !throwerInfo)
			return next(new AppError('Invalid thrower ID', 400));
		if (receiver && !receiverInfo)
			return next(new AppError('Invalid receiver ID', 400));
		if (defender && !defenderInfo)
			return next(new AppError('Invalid defender ID', 400));

		if (!['complete', 'drop', 'throwaway', 'block'].includes(result))
			return next(new AppError('Invalid throw result specified', 400));
		if (goal !== -1 && goal !== 0 && goal !== 1)
			return next(new AppError('Invalid goal specification', 400));

		const totalLength =
			res.locals.format.length + 2 * res.locals.format.endzone;
		const totalWidth = res.locals.format.width;

		if (x0 > totalLength || x1 > totalLength || x0 < 0 || x1 < 0)
			return next(new AppError('Invalid x coordinate', 400));
		if (y0 > totalWidth || y1 > totalWidth || y0 < 0 || y1 < 0)
			return next(new AppError('Invalid y coordinate', 400));

		let message1, message2;
		let gameOver = 0;

		//resolve the result of the pass
		//other team picks up - only used when we're pulling
		if (
			!thrower &&
			!receiver &&
			!defender &&
			!x0 &&
			!y0 &&
			x1 !== undefined &&
			y1 !== undefined &&
			result === 'pickup' &&
			goal === 0 &&
			state === 0
		) {
			message1 = `${res.locals.game.opponent} picked up the disc.`;
		}
		//other team scores
		else if (!thrower && !receiver && !defender && goal === -1 && state === 0) {
			message1 = `${res.locals.game.opponent} scored.`;
			res.locals.game.oppScore++;
			currentPoint.scored = -1;
			if (
				(res.locals.game.oppScore >= res.locals.game.cap &&
					res.locals.game.oppScore - res.locals.game.score >=
						res.locals.game.winBy) ||
				res.locals.game.oppScore >= res.locals.game.hardCap
			) {
				gameOver = -1;
				message2 = `${res.locals.game.opponent} wins.`;
			}
		}
		//other team drops it
		else if (
			state === 0 &&
			!thrower &&
			!receiver &&
			!defender &&
			result === 'drop'
		) {
			message1 = `${res.locals.game.opponent} dropped the disc.`;
		}
		//other team throws it away
		else if (
			state === 0 &&
			!thrower &&
			!receiver &&
			!defender &&
			result === 'drop'
		) {
			message1 = `${res.locals.game.opponent} threw a turnover.`;
		}
		//stall out
		else if (x0 !== undefined && y0 !== undefined && result === 'stall') {
			if (throwerInfo) {
				message1 = `${
					throwerInfo.displayName ||
					throwerInfo.firstName + ' ' + throwerInfo.lastName
				} got stalled out.`;
			} else {
				`${res.locals.game.opponent} got stalled out.`;
			}
		}
		//we pick up, either on a pull or after an opponent turnover
		else if (
			receiver &&
			!x0 &&
			!y0 &&
			x1 !== undefined &&
			y1 !== undefined &&
			result === 'pickup' &&
			goal === 0 &&
			state === 1
		) {
			if (x1 > res.locals.format.length + res.locals.format.endzone)
				return next(
					new AppError(
						'You may not start a possession in your attacking endzone.',
						400
					)
				);
			message1 = `${
				receiverInfo.displayName ||
				receiverInfo.firstName + ' ' + receiverInfo.lastName
			} picked up the disc.`;
		}
		//we complete a pass (not yet a goal)
		else if (
			thrower &&
			receiver &&
			x0 !== undefined &&
			y0 !== undefined &&
			x1 !== undefined &&
			y1 !== undefined &&
			result === 'complete' &&
			goal === 0 &&
			state === 1
		) {
			const yds = (
				Math.max(res.locals.format.endzone + res.locals.format.length, x1) - x0
			).toFixed(1);
			message1 = `${
				throwerInfo.displayName ||
				throwerInfo.firstName + ' ' + throwerInfo.lastName
			}&nbsp;&rarr;&nbsp;${
				receiverInfo.displayName ||
				receiverInfo.firstName + ' ' + receiverInfo.lastName
			} (${yds > 0 ? '+' : ''}${yds})`;

			if (lastPass && lastPass.receiver) {
			}
		}
		//we throw it away
		else if (
			state === 2 &&
			thrower &&
			x0 !== undefined &&
			x1 !== undefined &&
			y0 !== undefined &&
			y1 !== undefined &&
			result === 'throwaway'
		) {
			message1 = `${
				throwerInfo.displayName ||
				throwerInfo.firstName + ' ' + throwerInfo.lastName
			} threw a turnover.`;
		}
		//we drop it
		else if (
			state === 2 &&
			thrower &&
			receiver &&
			x0 !== undefined &&
			x1 !== undefined &&
			y0 !== undefined &&
			y1 !== undefined &&
			result === 'drop'
		) {
			message1 = `${
				receiverInfo.displayName ||
				receiverInfo.firstName + ' ' + receiverInfo.lastName
			} dropped the disc.`;
		}
		//we get a D
		else if (defender && x1 !== undefined && y1 !== undefined && state === 0) {
			message1 = `${
				defenderInfo.displayName ||
				defenderInfo.firstName + ' ' + defenderInfo.lastName
			} got a block.`;
		}
		//we scored a goal - edit the last pass to show that we scored a goal, check for win
		else if ((state === 1 || state === 2) && goal === 1) {
			if (x1 < res.locals.format.endzone + res.locals.format.length)
				return next(
					new AppError(
						'Location is not in the endzone. Enter another pass or undo the previous pass to place it in the endzone and try again.',
						400
					)
				);

			lastPass.goal = 1;
			currentPoint.scored = 1;
			res.locals.game.score++;
			//regular goal
			if (state === 2) {
				if (
					(res.locals.game.score >= res.locals.game.cap &&
						res.locals.game.score - res.locals.game.oppScore >=
							res.locals.game.winBy) ||
					res.locals.game.score >= res.locals.game.hardCap
				) {
					gameOver = 1;
					message2 = `${res.locals.team.name} wins.`;
				} else {
					message2 = `${
						receiverInfo.displayName ||
						receiverInfo.firstName + ' ' + receiverInfo.lastName
					} scored.`;
				}
			}
			//a Callahan can be coded by saying a player got a D and then immediately indicating a goal by our team
			else {
				const info = res.locals.team.find((p) => {
					return p.id === lastPass.defender;
				});
				if (!info)
					return next(
						new AppError(`Could not find info for player ${lastPass.defender}`)
					);
				message1 = `${
					info.displayName || info.firstName + ' ' + info.lastName
				} gpt a Callahan!`;
				if (
					(res.locals.game.score >= res.locals.game.cap &&
						res.locals.game.score - res.locals.game.oppScore >=
							res.locals.game.winBy) ||
					res.locals.game.score >= res.locals.game.hardCap
				) {
					gameOver = 1;
					message2 = `${res.locals.team.name} wins.`;
				}
			}
		}

		if (goal !== 1) {
			currentPoint.passes.push({
				thrower,
				receiver,
				defender,
				x0,
				y0,
				x1,
				y1,
				result,
				goal,
			});
		}
		res.locals.game.markModified('points');
		const data = await res.locals.game.save();

		res.status(200).json({
			status: 'success',
			data,
			message1,
			message2,
		});
	}
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
