import { showMessage } from './messages.js';

document.addEventListener('DOMContentLoaded', () => {
	const [status, msg, duration] = ['status', 'alert', 'duration'].map((el) => {
		return document.querySelector('body').getAttribute(`data-${el}`);
	});

	if (!status || !msg || !parseInt(duration)) return;
	console.log(status, msg, duration);
	showMessage(status, msg, parseInt(duration));
});
