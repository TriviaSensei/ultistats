const pwForm = document.querySelector('#pw-reset-form');
const email = document.querySelector('#email');
const container = document.querySelector('#container-outer');

import { showMessage } from './utils/messages.js';
import { handleRequest } from './utils/requestHandler.js';

document.addEventListener('DOMContentLoaded', () => {
	pwForm.addEventListener('submit', (e) => {
		e.preventDefault();
		console.log('hi');
		const handler = (res) => {
			console.log(res);
			if (res.status === 'success') {
				container.innerHTML =
					'If an account with that e-mail exists, a password reset link has been sent to it. Check your spam folder if it does not appear in your inbox.';
			} else {
				showMessage('error', res.message, 2000);
			}
		};

		handleRequest(
			'/api/v1/users/forgotPassword',
			'PATCH',
			{ email: email.value },
			handler
		);
	});
});
