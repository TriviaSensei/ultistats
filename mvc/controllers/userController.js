const User = require('../models/userModel');
const Team = require('../models/teamModel');
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

exports.searchUsers = catchAsync(async (req, res, next) => {
	if (req.body.name === undefined) {
		const users = await User.find().populate({
			path: 'teams',
			populate: {
				path: 'subscription',
				match: { active: true },
			},
		});
		users.sort((a, b) => {
			if (a.lastName !== b.lastName)
				return a.lastName.localeCompare(b.lastName);
			else return a.firstName.localeCompare(b.firstName);
		});
		return res.status(200).json({
			status: 'success',
			data: users,
		});
	} else {
		let arr = [];
		if (req.body.name) {
			const names = req.body.name.split(',');
			if (names.length === 1) {
				arr.push({
					$or: [
						{ firstName: { $regex: req.body.name.trim(), $options: 'i' } },
						{ lastName: { $regex: req.body.name.trim(), $options: 'i' } },
					],
				});
			} else {
				arr.push({ firstName: { $regex: names[1].trim(), $options: 'i' } });
				arr.push({ lastName: { $regex: names[0].trim(), $options: 'i' } });
			}
		}
		if (req.body.email) {
			arr.push({ email: { $regex: req.body.email, $options: 'i' } });
		}

		let users = await User.find({ $and: arr }).populate({
			path: 'teams',
			populate: {
				path: 'subscription',
				match: { active: true },
			},
		});

		if (req.body.hasTeam) {
			users = users.filter((u) => {
				return u.teams.length > 0;
			});
		}
		if (req.body.hasSub) {
			users = users.filter((u) => {
				return u.teams.some((t) => {
					if (!t.subscription) return false;
					if (t.subscription.expires > Date.now()) return true;
				});
			});
		}

		users.sort((a, b) => {
			if (a.lastName !== b.lastName)
				return a.lastName.localeCompare(b.lastName);
			else return a.firstName.localeCompare(b.firstName);
		});

		res.status(200).json({ status: 'success', data: users });
	}
});

exports.handleManagerRequest = catchAsync(async (req, res, next) => {
	const team = await Team.findById(req.params.id);
	if (!team) return next(new AppError('Team ID not found.', 404));

	let found = false;

	//remove the request from the team's queue
	team.requestedManagers = team.requestedManagers.filter((r) => {
		if (r.toString() === res.locals.user._id.toString()) {
			found = true;
			return false;
		}
		return true;
	});

	if (!found) return next(new AppError('Request not found', 404));

	//if this is an acceptance...
	if (req.body.accept) {
		//check if the user is already a manager on the team
		if (
			team.managers.some((m) => {
				return m.toString() === res.locals.user._id.toString();
			})
		)
			return next(new AppError('You are already a manager of this team.', 400));

		//push the user into the team's manager list
		team.managers.push(res.locals.user._id);
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
		return r._id.toString() !== team._id.toString();
	});
	//save the user
	res.locals.user.markModified('teamRequests');
	await res.locals.user.save({ validateBeforeSave: false });

	res.status(200).json({
		status: 'success',
		message: req.body.accept
			? `You are now a manager of ${team.name}.`
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

	const updatedUser = await User.findByIdAndUpdate(req.user.id, updatedInfo, {
		new: true,
		runValidators: true,
	});
	res.status(200).json({
		status: 'success',
		message: 'Successfully updated information',
		data: {
			user: updatedUser,
		},
	});
});

exports.getMe = catchAsync(async (req, res, next) => {
	if (!res.locals.user)
		return next(new AppError('You are not logged in.', 403));
	res.status(200).json({
		status: 'success',
		data: res.locals.user,
	});
});

exports.getUser = catchAsync(async (req, res, next) => {
	let user = await User.findById(req.params.id).select([
		'-email',
		'-password',
		'-passwordConfirm',
		'-passwordChangedAt',
		'-activationToken',
		'-activationTokenExpires',
		'-teams',
		'-teamRequests',
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

exports.updateSettings = catchAsync(async (req, res, next) => {
	const allowedSettings = ['nameDisplay'];

	const modifiedBody = {};
	for (const key of allowedSettings) {
		if (req.body[key]) modifiedBody[key] = req.body[key];
	}

	res.locals.user.settings = {
		...res.locals.user.settings,
		...modifiedBody,
	};

	res.locals.user.markModified('settings');
	await res.locals.user.save({ validateBeforeSave: false });
	res.status(200).json({
		status: 'success',
		message: 'Settings updated',
		data: res.locals.user.settings,
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
