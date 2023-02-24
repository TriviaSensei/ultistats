import { showMessage } from './utils/messages.js';

document.addEventListener('DOMContentLoaded', () => {
	const data = document.querySelector('#data');
	showMessage('info', data.value);
	setTimeout(() => {
		location.href = '/mystuff';
	}, 1000);
});
