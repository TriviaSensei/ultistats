const path = require('path');
const express = require('express');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const AppError = require('./utils/appError');
const rateLimit = require('express-rate-limit');
const { v4: uuidV4 } = require('uuid');

const errorHandler = require('./mvc/controllers/errorController');

const authController = require('./mvc/controllers/authController');

const formatRouter = require('./mvc/routes/formatRoutes');
const gameRouter = require('./mvc/routes/gameRoutes');
const teamRouter = require('./mvc/routes/teamRoutes');
const tournamentRouter = require('./mvc/routes/tournamentRoutes');
const userRouter = require('./mvc/routes/userRoutes');
const viewRouter = require('./mvc/routes/viewRoutes');
// const subscriptionRouter = require('./mvc/routes/subscriptionRoutes');
// const subscriptionController = require('./mvc/controllers/subscriptionController');

// const viewRouter = require('./routes/viewRoutes');

const app = express();

app.set('view engine', 'pug');
//directory for views is /views
app.set('views', path.join(__dirname, 'mvc/views'));

//serving static files
//all static files (css, js, images) will be served from this folder as a result
app.use(express.static(path.join(__dirname, 'public')));

//development logging
app.use(morgan('dev'));

// app.post(
// 	'/webhook-checkout',
// 	express.raw({ type: 'application/json' }),
// 	subscriptionController.webhookCheckout
// );

//body parser, read data from body to req.body
app.use(
	express.json({
		limit: '5mb',
	})
);

//testing middleware
app.use((req, res, next) => {
	req.requestTime = new Date().toISOString();
	//console.log(req.cookies);
	next();
});
app.use(cookieParser());

// 2) Routes

// app.use('/api/v1/users/', userRouter);
// app.use('/api/v1/games/', gameRouter);
// app.use('/api/v1/venues/', venueRouter);
// app.use('/api/v1/gigs/', gigRouter);
// app.use('/', viewRouter);

app.use('/api/v1/formats/', formatRouter);
app.use('/api/v1/games/', gameRouter);
app.use('/api/v1/teams/', teamRouter);
app.use('/api/v1/tournaments/', tournamentRouter);
app.use('/api/v1/users/', userRouter);
// app.use('/api/v1/subscriptions/', subscriptionRouter);

const limiter = rateLimit({
	max: 3,
	windowMs: 60 * 60 * 1000,
	message: {
		status: 'fail',
		message: 'You are doing that too much. Try again later.',
	},
});

app.use('/api/v1/contact', limiter);

app.post('/api/v1/contact', authController.protect, async (req, res) => {
	const sgMail = require('@sendgrid/mail');
	sgMail.setApiKey(process.env.SG_API_KEY);

	const msg = {
		from: process.env.EMAIL_FROM,
		to: process.env.ADMIN_EMAIL,
		reply_to: res.locals.user.email,
		subject: `UltiStats message from ${res.locals.user.displayName} - ${req.body.subject}`,
		text: `Message from ${res.locals.user.displayName}\nE-Mail: ${res.locals.user.email}\nSubject: ${req.body.subject}\n\n${req.body.message}`,
	};
	try {
		await sgMail.send(msg);
	} catch (e) {
		console.log(e.response.body.errors[0]);
		return res
			.status(e.code)
			.json({ status: 'fail', message: e.response.body.errors[0].message });
	}
	res.status(200).json({
		status: 'success',
		message: 'Message sent.',
	});
});

app.use('/', viewRouter);

app.all('*', (req, res, next) => {
	//any argument passed to a next() function is assumed to be an error; skips all other middleware and goes to the error handler.
	next(new AppError(`Could not find ${req.originalUrl} on this server.`, 404));
});

app.use(errorHandler);

module.exports = app;
