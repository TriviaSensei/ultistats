const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config({ path: './config.env' });
const port = process.env.PORT || 3000;

const app = require('./app');

const DB = process.env.DATABASE.replace('<PASSWORD>', process.env.DB_PASSWORD);

mongoose.set('strictQuery', false);

mongoose
	.connect(DB, {
		useNewUrlParser: true,
		useUnifiedTopology: true,
	})
	.then(async () => {
		console.log('DB connection successful');
	});

const server = app.listen(port, () => {
	console.log(
		`Application started on port ${port}, running in ${process.env.NODE_ENV}`
	);
});

const http = require('http').Server(app);
