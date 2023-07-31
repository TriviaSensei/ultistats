const pwConfirmSpan = document.querySelector('#pw-confirm-span');
const pwSpan = document.querySelector('#pw-span');
const pwConfirmBar = document.querySelector('.pw-confirm-validator');
import { handleRequest } from './utils/requestHandler.js';
import { showMessage } from './utils/messages.js';

const pw = document.querySelector('#password');
const pwConfirm = document.querySelector('#password-confirm');
const token = document.querySelector('#token');

const form = document.querySelector('#pw-reset-form');

const checkPasswordMatch = () => {
	const setInvalid = () => {
		pwConfirmBar.classList.remove('valid');
		pwConfirmBar.classList.add('invalid');
		pwConfirmSpan.classList.remove('valid-pw-confirm');
		pwConfirmSpan.classList.add('invalid-pw-confirm');
	};
	if (pw.value !== pwConfirm.value) {
		setInvalid();
		return;
	}

	const pseudo = window.getComputedStyle(pwSpan, ':after');
	if (pseudo.content.charCodeAt(1) === 10005) {
		setInvalid();
		return;
	}
	pwConfirmBar.classList.remove('invalid');
	pwConfirmBar.classList.add('valid');
	pwConfirmSpan.classList.remove('invalid-pw-confirm');
	pwConfirmSpan.classList.add('valid-pw-confirm');
};

document.addEventListener('DOMContentLoaded', () => {
	if (!token || !token.value) {
		showMessage('error', 'Invalid or expired reset token', 2000);
		setTimeout(() => {
			location.href = '/forgotPassword';
		}, 2000);
	}

	pw.addEventListener('keyup', checkPasswordMatch);
	pwConfirm.addEventListener('keyup', checkPasswordMatch);
	pw.addEventListener('change', checkPasswordMatch);
	pwConfirm.addEventListener('change', checkPasswordMatch);

	form.addEventListener('submit', (e) => {
		e.preventDefault();

		const handler = (res) => {
			if (res.status === 'success') {
				showMessage('info', 'Password successfully reset.');
				form.innerHTML = '';
				setTimeout(() => {
					location.href = '/me';
				}, 1000);
			} else {
				showMessage('error', res.message);
			}
		};

		const body = {
			password: pw.value,
			passwordConfirm: pwConfirm.value,
		};

		handleRequest(
			`/api/v1/users/resetPassword/${token.value}`,
			'PATCH',
			body,
			handler
		);
	});
});
