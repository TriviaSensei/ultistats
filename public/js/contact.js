import { showMessage } from './utils/messages.js';
import { handleRequest } from './utils/requestHandler.js';
const contactForm = document.querySelector('#contact-form');
const submitButton = contactForm.querySelector('button');

const subjectEntry = document.querySelector('#subject');
const messageEntry = document.querySelector('#message');

contactForm.addEventListener('submit', (e) => {
	e.preventDefault();

	if (!subjectEntry || !messageEntry) return;

	if (submitButton) submitButton.disabled = true;

	subjectEntry.disabled = true;
	messageEntry.disabled = true;

	const subject = subjectEntry.value;
	const message = messageEntry.value;

	subjectEntry.value = '';
	messageEntry.value = '';

	const body = {
		subject,
		message,
	};

	const handler = (res) => {
		if (res.status === 'success') {
			showMessage('info', res.message, 2000);
		} else {
			showMessage('error', res.message, 2000);
		}

		setTimeout(() => {
			if (submitButton) submitButton.disabled = false;
			subjectEntry.disabled = false;
			messageEntry.disabled = false;
		}, 1000);
	};

	handleRequest('/api/v1/contact', 'POST', body, handler);
});
