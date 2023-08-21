import { handleRequest } from './utils/requestHandler.js';
import { showMessage } from './utils/messages.js';

const loginForm = document.querySelector('#login-form');
const email = document.querySelector('#email');
const password = document.querySelector('#password');

const handleLogin = (e) => {
	if (e.target !== loginForm) return;
	e.preventDefault();

	const str = '/api/v1/users/login';
	const body = {
		email: email.value,
		password: password.value,
	};
	const handler = (res) => {
		if (res.status === 'success') {
			showMessage('info', 'Successfully logged in');
			setTimeout(() => {
				location.href = '/mystuff';
			}, 1000);
		} else {
			showMessage('error', res.message);
		}
	};
	handleRequest(str, 'POST', body, handler);
};

document.addEventListener('DOMContentLoaded', () => {
	loginForm.addEventListener('submit', handleLogin);
});
