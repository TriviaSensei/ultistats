const factory = require('./handlerFactory');
const catchAsync = require('../../utils/catchAsync');
const AppError = require('../../utils/appError');
const Team = require('../models/teamModel');
const User = require('../models/userModel');
const Email = require('../../utils/email');

const { v4: uuidV4 } = require('uuid');
const rosterLimit = 40;

exports.addPlayer = catchAsync(async (req, res, next) => {
	if (!req.body.firstName)
		return next(new AppError('First name not specified.', 400));
	if (!req.body.lastName)
		return next(new AppError('Last name not specified.', 400));
	if (req.body.number && isNaN(parseInt(req.body.number)))
		return next(new AppError('Invalid number.', 400));
	if (req.body.number && parseInt(req.body.number) < 0)
		return next(new AppError('Number must be non-negative.', 400));

	const team = await Team.findById(req.params.id);
	if (!team) return next(new AppError('Team ID not found.', 404));

	if (team.roster.length >= rosterLimit)
		return next(
			new AppError(`The roster limit is ${rosterLimit} players.`, 400)
		);

	let status = 'success';
	let message = '';

	const existingPlayer = team.roster.find((p) => {
		if (
			p.firstName.toLowerCase() === req.body.firstName.toLowerCase() &&
			p.lastName.toLowerCase() === req.body.lastName.toLowerCase()
		) {
			message = `A player with name (${req.body.lastName}, ${req.body.firstName}) has already been added to your team.`;
			return true;
		} else if (
			p.number !== '' &&
			parseInt(p.number) === parseInt(req.body.number)
		) {
			message = `Jersey number ${req.body.number} is already worn by ${p.firstName} ${p.lastName}`;
			return true;
		}
	});
	if (existingPlayer) status = 'warning';

	team.roster.push({
		...req.body,
		id: uuidV4(),
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

	team.roster = team.roster.filter((p) => {
		if (status === 'warning' && p.id === req.body.id) {
			status = 'success';
			message = `Player ${p.lastName}, ${p.firstName} removed from team.`;
			return false;
		}
		return true;
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

	team.roster = team.roster.map((p) => {
		if (p.id === req.body.id) {
			status = 'success';
			message = 'Player successfully modified.';
			found = true;
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

	//...and does not have a pending request to manage this team
	if (
		newManager.teamRequests.some((t) => {
			return t.id === team._id;
		})
	) {
		return next(
			new AppError(
				'You have already requested to add this user as a team manager.',
				400
			)
		);
	}

	//add this team to the user's management request queue.
	newManager.teamRequests.push({
		id: team._id,
		name: `${team.name} (${team.season})`,
	});
	newManager.markModified('teamRequests');
	await newManager.save();

	//add this user to the team's management request queue.
	team.requestedManagers.push({
		id: newManager._id,
		name: `${newManager.lastName}, ${newManager.firstName}`,
	});
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
		`${team.name} (${team.season}) would like to add you as a manager`
	).sendManagerRequest();
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
		if (m.id === req.body.id) {
			found = true;
			return false;
		}
		return true;
	});
	if (found) {
		team.markModified('requestedManagers');
		await team.save();

		const user = User.findById(req.body.id);
		if (user) {
			user.teamRequests = user.teamRequests.filter((r) => {
				return r.id !== team._id;
			});
			user.markModified('teamRequests');
			await user.save();
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
exports.getTeam = factory.getOne(Team);
exports.getAllTeams = factory.getAll(Team);
exports.updateTeam = factory.updateOne(Team);
exports.deleteTeam = factory.deleteOne(Team);
