const AppError = require('../../utils/appError');

const sendErrorDev = (err, req, res) => {
	console.log(err.message);
	if (req.originalUrl.startsWith('/api')) {
		console.log(err.stack);
		return res.status(err.statusCode).json({
			status: err.status,
			error: err,
			message: err.message,
			stack: err.stack,
		});
	}
	return res
		.status(err.statusCode)
		.render('error', { title: 'Something went wrong.', msg: err.message });
};

const sendErrorProd = (err, req, res) => {
	//A) operational error, trusted error: send message to client.
	if (req.originalUrl.startsWith('/api')) {
		if (err.isOperational) {
			return res.status(err.statusCode).json({
				status: err.status,
				message: err.message,
			});
		}
		//B) programming or other unknown error. Do not leak details to client.
		//log the error (which the client can't see)
		console.error('ERROR', err);

		return res.status(500).json({
			status: 'error',
			message: 'Something went wrong.',
		});
	}

	if (err.isOperational) {
		console.log(err.message);
		return res.status(err.statusCode).render('error', {
			title: 'Something went wrong.',
			msg: err.message,
		});
	}
	console.error('ERROR', err);

	return res.status(err.statusCode).render('error', {
		title: 'Something went wrong',
		msg: 'Please try again later.',
	});
};

const handleCastErrorDB = (err) => {
	const message = `Invalid ${err.path}: ${err.value}.`;
	return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
	const value = err.keyValue.name;
	const message = `Duplicate field value: ${value}. Please use another value.`;
	return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
	const message = `Invalid input data.\n${err}`;
	return new AppError(message, 400);
};

const handleJWTError = (err) =>
	new AppError('You are not logged in. Please log in for access.', 401);

const handleTokenExpiredError = (err) =>
	new AppError('Your token has expired. Please log in again.', 401);

module.exports = (err, req, res, next) => {
	err.statusCode = err.statusCode || 500;
	err.status = err.status || 'Error';

	if (process.env.NODE_ENV === 'development') {
		sendErrorDev(err, req, res);
	} else if (process.env.NODE_ENV === 'production') {
		// eslint-disable-next-line node/no-unsupported-features/es-syntax
		let error = { ...err, message: err.message };
		if (error.name === 'CastError') error = handleCastErrorDB(error);
		if (error.code === 11000) error = handleDuplicateFieldsDB(error);
		if (err.toString().startsWith('ValidationError'))
			error = handleValidationErrorDB(err.toString());
		if (error.name === 'JsonWebTokenError') error = handleJWTError(error);
		if (error.name === 'TokenExpiredError')
			error = handleTokenExpiredError(error);
		sendErrorProd(error, req, res);
	}
};
