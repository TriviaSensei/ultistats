const pwConfirmSpan = document.querySelector('#pw-confirm-span');
const pwSpan = document.querySelector('#pw-span');
const pwConfirmBar = document.querySelector('.pw-confirm-validator');
const pw = document.querySelector('#password');
const pwConfirm = document.querySelector('#password-confirm');

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
	pw.addEventListener('keyup', checkPasswordMatch);
	pwConfirm.addEventListener('keyup', checkPasswordMatch);
	pw.addEventListener('change', checkPasswordMatch);
	pwConfirm.addEventListener('change', checkPasswordMatch);
});
