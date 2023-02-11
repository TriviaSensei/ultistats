import { handleRequest } from './utils/requestHandler.js';
import { showMessage } from './utils/messages.js';
import { getElementArray } from './utils/getElementArray.js';
import { createElement } from './utils/createElementFromSelector.js';

const requestTable = document.querySelector('#request-table');
const requestArea = document.querySelector('#request-area');

const userForm = document.querySelector('#user-form');
const firstName = document.querySelector('#first-name');
const lastName = document.querySelector('#last-name');
const displayName = document.querySelector('#display-name');
const email = document.querySelector('#email');

const passwordForm = document.querySelector('#password-form');
const currentPW = document.querySelector('#current-pw');
const newPW = document.querySelector('#new-pw');
const pwConfirm = document.querySelector('#pw-confirm');

const handleRequestResponse = (e) => {
	const action = e.target.getAttribute('data-action');
	const id = e.target.getAttribute('data-id');
	if (!action || !id) return;

	const row = e.target.closest('tr');
	if (!row) return;
	const buttons = getElementArray(row, 'button');
	buttons.forEach((b) => {
		b.disabled = true;
	});

	let str = `/api/v1/users/handleRequest/${id}`;
	let body = {
		accept: action === 'accept',
	};
	let handler = (res) => {
		showMessage(res.status, res.message);
		if (res.status === 'success') {
			row.remove();
			const rows = requestTable.querySelector('tbody > tr');
			if (!rows) {
				if (requestArea) requestArea.remove();
			}
		} else {
			buttons.forEach((b) => {
				b.disabled = false;
			});
		}
	};
	handleRequest(str, 'PATCH', body, handler);
};

const handleUserUpdate = (e) => {
	if (e.target !== userForm) return;
	e.preventDefault();

	const str = `/api/v1/users/updateMe`;
	const body = {
		firstName: firstName.value,
		lastName: lastName.value,
		displayName: displayName.value,
		email: email.value,
	};
	const handler = (res) => {
		showMessage(res.status, res.message);
	};
	handleRequest(str, 'PATCH', body, handler);
};

const handlePasswordChange = (e) => {
	if (e.target !== passwordForm) return;
	e.preventDefault();

	const str = `/api/v1/users/changePassword`;
	const body = {
		currentPassword: currentPW.value,
		password: newPW.value,
		passwordConfirm: pwConfirm.value,
	};
	const handler = (res) => {
		if (res.status === 'success') {
			showMessage(`info`, 'Password changed.');
			currentPW.value = '';
			newPW.value = '';
			pwConfirm.value = '';
		} else {
			showMessage('error', res.message);
		}
	};
	handleRequest(str, 'PATCH', body, handler);
};

document.addEventListener('DOMContentLoaded', () => {
	if (requestTable) {
		const buttons = getElementArray(requestTable, 'button');
		buttons.forEach((b) => {
			b.addEventListener('click', handleRequestResponse);
		});
	}

	if (userForm) userForm.addEventListener('submit', handleUserUpdate);
	if (passwordForm)
		passwordForm.addEventListener('submit', handlePasswordChange);
});
