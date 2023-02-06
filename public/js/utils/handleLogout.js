import { handleRequest } from './requestHandler.js';
import { showMessage } from './messages.js';

const logoutLink = document.querySelector('#logout');

const handleLogout = (e) => {
	e.preventDefault();

	if (e.target !== logoutLink) return;

	const str = '/api/v1/users/logout';
	const handler = (res) => {
		if (res.status === 'success') {
			showMessage('info', 'Logged out');
			setTimeout(() => {
				location.href = '/login';
			}, 1000);
		} else {
			showMessage('error', 'Something went wrong. Please try again');
		}
	};
	handleRequest(str, 'GET', null, handler);
};

document.addEventListener('DOMContentLoaded', () => {
	if (logoutLink) {
		logoutLink.addEventListener('click', handleLogout);
	}
});
