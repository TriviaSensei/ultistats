import { showMessage } from './messages.js';

document.addEventListener('DOMContentLoaded', () => {
	const [status, msg, duration, redirect] = [
		'status',
		'alert',
		'duration',
		'redirect',
	].map((el) => {
		return document.querySelector('body').getAttribute(`data-${el}`);
	});

	if (!status || !msg || !parseInt(duration)) return;
	showMessage(status, msg, parseInt(duration));
	if (redirect) {
		setTimeout(() => {
			location.href = redirect;
		}, duration);
	}
});
