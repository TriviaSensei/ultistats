const factory = require('./handlerFactory');
const catchAsync = require('../../utils/catchAsync');
const AppError = require('../../utils/appError');
const Team = require('../models/teamModel');
const User = require('../models/userModel');
const Email = require('../../utils/email');

const { v4: uuidV4 } = require('uuid');
const e = require('express');
const rosterLimit = 40;

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
			new AppError(`The roster limit is ${rosterLimit} players.`, 400)
		);

	let status = 'success';
	let message = '';

	let v = 1;
	const existingPlayer = team.roster.find((p) => {
		if (
			p.active &&
			p.firstName.toLowerCase() === req.body.firstName.toLowerCase() &&
			p.lastName.toLowerCase() === req.body.lastName.toLowerCase()
		) {
			message = `A player with that name (${req.body.lastName}, ${req.body.firstName}) has already been added to your team.`;
			team.roster.forEach((p2) => {
				if (
					p2.firstName.toLowerCase() === req.body.firstName.toLowerCase() &&
					p2.lastName.toLowerCase() === req.body.lastName.toLowerCase()
				) {
					v = Math.max(v, p2.v + 1);
				}
			});
			return true;
		} else if (
			p.active &&
			p.number !== '' &&
			parseInt(p.number) === parseInt(req.body.number)
		) {
			message = `Jersey number ${req.body.number} is already worn by ${p.firstName} ${p.lastName}`;
			return true;
		}
	});
	if (existingPlayer) status = 'warning';

	const { firstName, lastName, displayName, number, line, position, gender } =
		req.body;

	team.roster.push({
		firstName,
		lastName,
		displayName,
		number,
		line,
		position,
		gender,
		id: uuidV4(),
		v,
		active: true,
	});
	team.markModified('roster');
	const data = await team.save();

	res.status(200).json({
		status,
		message,
		data,
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
			message = `Player ${p.lastName}, ${p.firstName} removed from roster.`;
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
	});
});

exports.editPlayer = catchAsync(async (req, res, next) => {
	const team = await Team.findById(req.params.id);
	if (!team) return next(new AppError('Team ID not found.', 404));

	let status = 'fail';
	let message = 'Player not found';
	let found = false;

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
					message = `A player with that name (${req.body.lastName}, ${req.body.firstName}) is already on your team.`;
					return true;
				} else if (
					(req.body.number || p.number) &&
					parseInt(req.body.number || p.number) === parseInt(p2.number)
				) {
					message = `Jersey number ${req.body.number} is already worn by ${p2.firstName} ${p2.lastName}`;
					return true;
				}
				return false;
			});
			if (existingPlayer) status = 'warning';

			const val = validateNewPlayer({
				...p,
				...req.body,
			});

			if (val) return next(new AppError(val, 400));

			return {
				...p,
				...req.body,
			};
		}
		return p;
	});
	if (found) {
		team.markModified('roster');
		const data = await team.save();
		return res.status(200).json({
			status,
			message,
			data,
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

	//only managers can add other managers.
	if (!team.managers.includes(res.locals.user._id)) {
		return next(new AppError('You are not a manager of this team.', 403));
	}

	//make sure the new manager exists
	const newManager = await User.findOne({ email: req.body.email });
	if (!newManager) return next(new AppError('User not found.', 404));

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
			`${url}/managerRequests`,
		],
		process.env.EMAIL_FROM,
		`${team.name} (${team.season}) would like to add you as a manager`,
		`${res.locals.user.firstName} ${res.locals.user.lastName} has requested to add you as a manager of ${team.name} (${team.season}).`,
		`You may accept or decline the request, or review your requests with one of the links below:`
	).sendManagerRequest();

	res.status(200).json({
		status: 'success',
	});
});

exports.cancelAddManager = catchAsync(async (req, res, next) => {
	const team = await Team.findById(req.params.id);
	if (!team) return next(new AppError('Team ID not found.', 404));

	//only managers can manage team managers.
	if (!team.managers.includes(res.locals.user._id)) {
		return next(new AppError('You are not a manager of this team.', 403));
	}

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

exports.createTeam = factory.createOne(Team);
exports.getTeam = factory.getOne(Team, {
	path: 'managers',
	// model: User,
	// select: ['_id', 'firstName', 'lastName', 'displayName'],
});
exports.getAllTeams = factory.getAll(Team);
exports.updateTeam = factory.updateOne(Team);
exports.deleteTeam = factory.deleteOne(Team);
