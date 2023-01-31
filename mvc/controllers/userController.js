const User = require('../models/userModel');
const factory = require('./handlerFactory');
const catchAsync = require('../../utils/catchAsync');
const AppError = require('../../utils/appError');

const filterObj = (obj, ...allowedFields) => {
	const newObj = {};
	Object.keys(obj).forEach((el) => {
		if (allowedFields.includes(el)) newObj[el] = obj[el];
	});
	return newObj;
};

//middleware for aliasing
//make the default sort by last name
exports.sortByName = (req, res, next) => {
	req.query.sort = 'lastName';
	next();
};

exports.handleManagerRequest = catchAsync(async (req, res, next) => {
	const team = await Team.findById(req.body.id);
	if (!team) return next(new AppError('Team ID not found.', 404));

	let request;
	//remove the request from the team's queue
	team.requestedManagers = team.requestedManagers.filter((r) => {
		if (r.id === res.locals.user._id) {
			request = { ...r };
			return false;
		}
		return true;
	});

	if (!request) return next(new AppError('Request not found', 404));

	//if this is an acceptance...
	if (req.body.accept) {
		//check if the user is already a manager on the team
		if (team.managers.includes(res.locals.user._id))
			return next(new AppError('You are already a manager of this team.', 400));

		//push the user into the team's manager list
		team.mangers.push(res.locals.user._id);
		team.markModified('managers');

		//push the team into the user's managed teams list
		res.locals.user.teams.push(team._id);
		res.locals.user.markModified('teams');
	}

	//save the team
	team.markModified('requestedManagers');
	await team.save();

	//remove the request from the user's request queue
	res.locals.user.teamRequests = res.locals.user.teamRequests.filter((r) => {
		return r.id !== team._id;
	});
	//save the user
	res.locals.user.markModified('teamRequests');
	await res.locals.user.save();

	res.status(200).json({
		status: 'success',
		message: req.body.accept
			? `You are now a manager of ${team.name} (${team.season}).`
			: `Request deleted.`,
	});
});

exports.updateMe = catchAsync(async (req, res, next) => {
	//error if user tries to POST password data
	if (req.body.password || req.body.passwordConfirm) {
		return next(
			new AppError(
				'This route is not for password updates. Please use the changePassword route',
				400
			)
		);
	}

	//update the user's information
	const updatedInfo = filterObj(
		req.body,
		'firstName',
		'lastName',
		'displayName',
		'email'
	);
	//make sure the slug isn't taken, and update if it is for whatever reason

	const updatedUser = await User.findByIdAndUpdate(req.user.id, updatedInfo, {
		new: true,
		runValidators: true,
	});
	res.status(200).json({
		status: 'success',
		data: {
			user: updatedUser,
		},
	});
});

exports.getUser = catchAsync(async (req, res, next) => {
	let user = await User.findById(req.params.id).select([
		'-email',
		'-password',
		'-passwordConfirm',
		'-passwordChangedAt',
	]);

	if (!user) {
		return res.status(404).json({
			stauts: 'error',
			message: 'User not found',
		});
	}

	res.status(200).json({
		status: 'success',
		data: {
			user,
		},
	});
});

//standard routes
exports.getAllUsers = catchAsync(async (req, res, next) => {
	let users = await User.find().sort({
		lastName: 1,
		firstName: 1,
	});

	if (!users) {
		return res.status(404).json({
			status: 'fail',
			message: 'Users not found',
		});
	}

	res.status(200).json({
		status: 'success',
		data: users,
	});
});

exports.deleteUser = factory.deleteOne(User);
exports.updateUser = factory.updateOne(User);
