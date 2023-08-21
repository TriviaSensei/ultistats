const factory = require('./handlerFactory');
const catchAsync = require('../../utils/catchAsync');
const AppError = require('../../utils/appError');
const Team = require('../models/teamModel');
const User = require('../models/userModel');
const Tournament = require('../models/tournamentModel');
const Subscription = require('../models/subscriptionModel');
const Email = require('../../utils/email');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { v4: uuidV4 } = require('uuid');
const { rosterLimit } = require('../../utils/settings');
const Subscriptions = require('../models/subscriptionModel');

const validateNewPlayer = (player) => {
	if (!player.firstName) return 'First name not specified.';
	if (!player.lastName) return 'Last name not specified.';
	if (
		player.number &&
		(isNaN(parseInt(player.number)) ||
			player.number.length > 2 ||
			player.number.split().some((c) => {
				return isNaN(parseInt(c));
			}))
	)
		return 'Invalid number';
	if (
		player.number &&
		(parseInt(player.number) < 0 ||
			parseInt(player.number) > 99 ||
			parseFloat(player.number) !== parseInt(player.number))
	)
		return 'Number must be an integer from 00-99, inclusive';

	if (
		player.gender &&
		player.gender.toUpperCase() !== 'M' &&
		player.gender.toUpperCase() !== 'F'
	) {
		return 'Invalid gender match specified.';
	}

	return null;
};

exports.verifyOwnership = catchAsync(async (req, res, next) => {
	res.locals.team = await Team.findById(req.params.id).populate({
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

exports.addPlayer = catchAsync(async (req, res, next) => {
	const val = validateNewPlayer(req.body);
	if (val) return next(new AppError(val, 400));

	const team = await Team.findById(req.params.id);
	if (!team) return next(new AppError('Team ID not found.', 404));

	//verify that the roster limit has not been reached.
	if (
		team.roster.reduce((p, c) => {
			if (c.active) return p + 1;
			return p;
		}, 0) >= rosterLimit
	)
		return next(
			new AppError(`The team roster limit is ${rosterLimit} players.`, 400)
		);

	let status = 'success';
	let message = '';
	let pushIt = true;
	let toPush;

	const existingPlayer = team.roster.find((p, i) => {
		if (
			p.active &&
			p.firstName.toLowerCase() === req.body.firstName.toLowerCase() &&
			p.lastName.toLowerCase() === req.body.lastName.toLowerCase()
		) {
			pushIt = false;
			status = 'fail';
			message = `A player with that name (${req.body.lastName}, ${req.body.firstName}) has already been added to your team.`;
			return true;
		} else if (
			p.firstName.toLowerCase() === req.body.firstName.toLowerCase() &&
			p.lastName.toLowerCase() === req.body.lastName.toLowerCase()
		) {
			message = `Player ${p.firstName} ${p.lastName} has been reinstated to the roster.`;
			p.active = true;
			p.firstName = req.body.firstName;
			p.lastName = req.body.lastName;
			p.displayName = req.body.displayName;
			p.number = req.body.number;
			team.roster.some((p2, j) => {
				if (
					parseInt(p2.number) === parseInt(req.body.number) &&
					i !== j &&
					p2.active
				) {
					status = 'warning';
					message = `${message}\nNumber ${p2.number} is already being worn by ${p2.firstName} ${p2.lastName}`;
					return true;
				}
			});
			p.gender = req.body.gender;
			p.line = req.body.line;
			p.position = req.body.position;
			pushIt = false;
			toPush = p;
			return true;
		} else if (
			p.active &&
			p.number !== '' &&
			parseInt(p.number) === parseInt(req.body.number)
		) {
			status = 'warning';
			message = `Number ${p.number} is already being worn by ${p.firstName} ${p.lastName}`;
			return true;
		}
	});
	if (status === 'fail') {
		return next(new AppError(message, 400));
	}

	if (pushIt) {
		const { firstName, lastName, displayName, number, line, position, gender } =
			req.body;

		const id = uuidV4();

		toPush = {
			firstName,
			lastName,
			displayName,
			number,
			line,
			position,
			gender,
			id,
			active: true,
		};
		team.roster.push(toPush);
	}

	if (!message)
		message = `Player ${toPush.firstName} ${toPush.lastName} added to roster.`;

	team.markModified('roster');
	const data = await team.save();

	res.status(200).json({
		status,
		message,
		newPlayer: toPush,
		rosterLimit,
	});
});

exports.removePlayer = catchAsync(async (req, res, next) => {
	const team = await Team.findById(req.params.id);
	if (!team) return next(new AppError('Team ID not found.', 404));

	let status = 'warning';
	let message = 'Player was not found';

	team.roster.some((p) => {
		if (p.id === req.body.id) {
			status = 'success';
			message = `Player ${p.lastName}, ${p.firstName} removed from roster. You must manually remove them from any tournament rosters.`;
			p.active = false;
			return true;
		}
		return false;
	});
	team.markModified('roster');
	const data = await team.save();

	res.status(200).json({
		status,
		message,
		data,
		rosterLimit,
	});
});

exports.editPlayer = catchAsync(async (req, res, next) => {
	const team = await Team.findById(req.params.id);
	if (!team) return next(new AppError('Team ID not found.', 404));

	let status = 'fail';
	let message = 'Player not found';
	let found = false;
	let toReturn;

	team.roster = team.roster.map((p, i) => {
		if (p.id === req.body.id) {
			status = 'success';
			message = 'Player successfully modified.';
			found = true;

			const existingPlayer = team.roster.find((p2, j) => {
				if (i === j) return false;
				if (
					(req.body.firstName || p.firstName).toLowerCase() ===
						p2.firstName.toLowerCase() &&
					(req.body.lastName || p.lastName).toLowerCase() ===
						p2.lastName.toLowerCase()
				) {
					status = 'error';
					message = `A player with that name (${req.body.lastName}, ${req.body.firstName}) is already on your team.`;
					return true;
				} else if (
					(req.body.number || p.number) &&
					parseInt(req.body.number || p.number) === parseInt(p2.number)
				) {
					status = 'warning';
					message = `Jersey number ${req.body.number} is already worn by ${p2.firstName} ${p2.lastName}`;
					return true;
				}
				return false;
			});

			const val = validateNewPlayer({
				...p,
				...req.body,
			});

			if (val) return next(new AppError(val, 400));

			toReturn = {
				...p,
				...req.body,
			};

			return toReturn;
		}
		return p;
	});
	if (status === 'fail') return next(new AppError(message, 400));
	if (found) {
		team.markModified('roster');
		const data = await team.save();

		//also modify any tournaments with this player on the roster
		const tournaments = await Tournament.find({
			team: team._id,
		});

		await Promise.all(
			tournaments.map(async (t) => {
				if (
					t.roster.some((p, i) => {
						if (p.id === req.body.id) {
							t.roster[i] = {
								...p,
								...req.body,
							};
							return true;
						}
						return false;
					})
				) {
					t.markModified('roster');
					return t.save();
				}
				return t;
			})
		);

		return res.status(200).json({
			status,
			message,
			data,
			modifiedPlayer: toReturn,
		});
	}
	res.status(200).json({
		status,
		message,
	});
});

exports.requestAddManager = catchAsync(async (req, res, next) => {
	const team = await Team.findById(req.params.id);
	if (!team) return next(new AppError('Team ID not found.', 404));

	//make sure the new manager exists
	const newManager = await User.findOne({ email: req.body.email });
	if (!newManager)
		return next(new AppError('That e-mail was not found in the system.', 404));

	//...and does not have a pending request to manage this team or is already a manager
	if (
		newManager.teamRequests.some((t) => {
			return t.toString() === team._id.toString();
		})
	) {
		return next(
			new AppError(
				'You have already requested to add this user as a team manager.',
				400
			)
		);
	} else if (
		newManager.teams.some((t) => {
			return t.toString() === team._id.toString();
		})
	) {
		return next(
			new AppError('That user is already a manager of this team.', 400)
		);
	}

	//add this team to the user's management request queue.
	newManager.teamRequests.push(team._id);
	newManager.markModified('teamRequests');
	await newManager.save({ validateBeforeSave: false });

	//add this user to the team's management request queue.
	team.requestedManagers.push(newManager._id);
	team.markModified('requestedManagers');
	await team.save();

	//todo: send an e-mail
	const url = `${req.protocol}://${req.get('host')}`;
	await new Email(
		newManager,
		[
			`${url}/confirmManager/${team._id}`,
			`${url}/declineManager/${team._id}`,
			`${url}/me`,
		],
		process.env.EMAIL_FROM,
		`${team.name} (${team.season}) would like to add you as a manager`,
		`${res.locals.user.firstName} ${res.locals.user.lastName} has requested to add you as a manager of ${team.name} (${team.season}).`,
		`You may accept or decline the request, or review your requests with one of the links below:`
	).sendManagerRequest();

	res.status(200).json({
		status: 'success',
		newManager: {
			lastName: newManager.lastName,
			firstName: newManager.firstName,
			_id: newManager.id,
		},
	});
});

exports.cancelAddManager = catchAsync(async (req, res, next) => {
	const team = await Team.findById(req.params.id);
	if (!team) return next(new AppError('Team ID not found.', 404));

	let found = false;
	team.requestedManagers = team.requestedManagers.filter((m) => {
		if (m.toString() === req.body.id) {
			found = true;
			return false;
		}
		return true;
	});
	if (found) {
		team.markModified('requestedManagers');
		await team.save();

		const user = await User.findById(req.body.id);
		if (user) {
			user.teamRequests = user.teamRequests.filter((r) => {
				return r.toString() !== team._id.toString();
			});
			user.markModified('teamRequests');
			await user.save({ validateBeforeSave: false });
		}

		return res.status(200).json({
			status: 'success',
			message: 'Request cancelled',
		});
	}
	res.status(200).json({
		status: 'fail',
		message: 'Request not found',
	});
});

exports.leaveTeam = catchAsync(async (req, res, next) => {
	const team = await Team.findById(req.params.id);
	if (!team) return next(new AppError('Team ID not found.', 404));

	team.managers = team.managers.filter((m) => {
		return m.toString() !== res.locals.user._id.toString();
	});
	res.locals.user.teams = res.locals.user.teams.filter((t) => {
		return t.toString() !== team._id.toString();
	});

	team.markModified('managers');
	res.locals.user.markModified('teams');

	if (team.managers.length === 0) {
		await team.delete();
	} else await team.save();

	await res.locals.user.save({ validateBeforeSave: false });

	res.status(200).json({
		status: 'success',
		message: `You are no longer a manager of ${team.name} (${team.season})`,
	});
});

exports.getTournaments = catchAsync(async (req, res, next) => {
	const data = await Tournament.find({
		team: req.params.id,
	})
		.populate([
			{
				path: 'format',
			},
			{
				path: 'games',
				select: `_id round opponent result score oppScore period cap winBy hardCap timeouts`,
			},
		])
		.sort({
			startDate: 1,
		});

	res.status(200).json({
		status: 'success',
		data,
	});
});

exports.getTournamentDetails = catchAsync(async (req, res, next) => {
	const data = await Tournament.find({
		team: req.params.id,
	})
		.populate([
			{
				path: 'format',
			},
			{
				path: 'games',
				select: `_id round opponent result score oppScore period cap winBy hardCap timeouts points`,
			},
		])
		.sort({
			startDate: 1,
		});

	const sub = await Subscription.find({
		team: req.params.id,
		expires: { $gte: Date.now() },
	});

	res.status(200).json({
		status: 'success',
		data,
		subscription: sub.length === 0 ? null : sub[1].name,
	});
});

exports.createTeam = factory.createOne(Team);
exports.getTeam = factory.getOne(Team, {
	path: 'managers',
	// model: User,
	// select: ['_id', 'firstName', 'lastName', 'displayName'],
});
exports.getAllTeams = factory.getAll(Team);
exports.updateTeam = factory.updateOne(Team);
exports.deleteTeam = factory.deleteOne(Team);
