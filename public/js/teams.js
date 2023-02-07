import { handleRequest } from './utils/requestHandler.js';
import { showMessage } from './utils/messages.js';
import { getElementArray } from './utils/getElementArray.js';
import { createElement } from './utils/createElementFromSelector.js';
//team information
const teamSelect = document.querySelector('#team-select');
const teamName = document.querySelector('#team-name');
const teamSeason = document.querySelector('#season');
const division = document.querySelector('#division');
const color1 = document.querySelector('#color-1');
const color2 = document.querySelector('#color-2');
const color3 = document.querySelector('#color-3');
const color4 = document.querySelector('#color-4');

const getCheckedValue = (name) => {
	const el = document.querySelector(`input[name="${name}"]:checked`);
	if (!el) return '';
	return el.value;
};

//roster controls
const rosterForm = document.querySelector('#roster-form');
const firstName = document.querySelector('#first-name');
const lastName = document.querySelector('#last-name');
const displayName = document.querySelector('#display-name');
const number = document.querySelector('#number');
const position = document.querySelector('#position');
const pre1 = document.querySelector('#preview-1');
const pre2 = document.querySelector('#preview-2');
let roster = [];

//roster table
const rosterTable = document.querySelector('#roster-table');
const rosterBody = document.querySelector('#roster-list');
const fillerRow = document.querySelector('#filler-row');

const handleColorChange = (e) => {
	if (![color1, color2, color3, color4].includes(e.target)) return;

	pre1.style.color = color2.value;
	pre1.style.backgroundColor = color1.value;
	pre2.style.color = color4.value;
	pre2.style.backgroundColor = color3.value;
};

const removePlayerRow = (id) => {
	const row = document.querySelector(`tr[data-id="${id}"]`);
	if (row) row.remove();

	const rows = document.querySelector('.player-row');
	if (!rows) {
		if (fillerRow) fillerRow.classList.remove('invisible-div');
	}
};

const removePlayer = (id) => {
	if (teamSelect.value !== '') {
		const str = `/api/v1/teams/${teamSelect.value}/removePlayer`;
		const handler = (res) => {
			showMessage(res.status, res.message);
		};
		handleRequest(str, 'PATCH', { id }, handler);
	}

	roster = roster.filter((p) => {
		return p.id !== id;
	});
	removePlayerRow(id);
};

const handleRemovePlayer = (e) => {
	const row = e.target.closest('tr');
	if (!row) return;

	const id = row.getAttribute('data-id');
	removePlayer(id);
};

const addPlayerRow = (player) => {
	if (!player) return;
	if (fillerRow) fillerRow.classList.add('invisible-div');

	const info = [
		player.number,
		`${player.lastName}, ${player.firstName} ${
			player.v === 1 ? '' : '(' + player.v + ')'
		}`,
		player.gender,
		player.line,
		player.position,
	];

	const newRow = createElement('tr.player-row');
	info.forEach((i) => {
		const newCell = createElement('td');
		newCell.innerHTML = i;
		newRow.appendChild(newCell);
	});

	const editCell = createElement('td');
	const editButton = createElement('button');
	editButton.setAttribute('type', 'button');
	editButton.innerHTML = '✏️';
	editCell.appendChild(editButton);
	newRow.appendChild(editCell);

	const deleteCell = createElement('td');
	const delButton = createElement('button');
	delButton.setAttribute('type', 'button');
	delButton.innerHTML = '❌';
	deleteCell.appendChild(delButton);
	newRow.appendChild(deleteCell);
	delButton.addEventListener('click', handleRemovePlayer);

	newRow.setAttribute('data-number', player.number);
	if (player.id) {
		newRow.setAttribute('data-id', player.id);
	} else {
		newRow.setAttribute('data-id', window.crypto.randomUUID());
	}
	const rows = getElementArray(rosterBody, 'tr');

	if (
		!rows.some((r) => {
			if (parseInt(r.getAttribute('data-number')) > parseInt(player.number)) {
				rosterBody.insertBefore(newRow, r);
				return true;
			}
		})
	) {
		rosterBody.appendChild(newRow);
	}
};

const addPlayer = (player) => {
	let message = 'Player added.';
	let status = 'info';
	let v = 1;
	roster.some((p) => {
		if (
			p.firstName.toLowerCase() === player.firstName.toLowerCase() &&
			p.lastName.toLowerCase() === player.lastName.toLowerCase()
		) {
			message = `Player with name ${p.firstName} ${p.lastName} already exists on the roster.`;
			status = 'warning';

			roster.forEach((p2) => {
				if (
					p2.firstName.toLowerCase() === player.firstName.toLowerCase() &&
					p2.lastName.toLowerCase() === player.lastName.toLowerCase()
				) {
					v = Math.max(v, p2.v + 1);
				}
			});
			return true;
		} else if (parseInt(p.number) === parseInt(player.number)) {
			message = `Number ${p.number} is already being worn by ${p.firstName} ${p.lastName}`;
			status = 'warning';
			return true;
		}
	});

	const toPush = { ...player, v, id: window.crypto.randomUUID() };
	roster.push(toPush);
	addPlayerRow(toPush);

	showMessage(status, message, status === 'info' ? 500 : 2000);
};

const handleAddPlayer = (e) => {
	e.preventDefault();

	if (e.target === rosterForm) {
		addPlayer({
			firstName: firstName.value,
			lastName: lastName.value,
			displayName: displayName.value,
			number: number.value,
			line:
				document.querySelector(`input[type="radio"][name="line"]:checked`)
					?.value || '?',
			position: position.value,
			gender:
				document.querySelector(
					`input[type="radio"][name="gender-match"]:checked`
				)?.value || '?',
		});

		firstName.value = '';
		lastName.value = '';
		displayName.value = '';
		number.value = '';

		firstName.focus();
	}
};

const getTeam = (e) => {
	if (e.target !== teamSelect) return;
	if (!teamSelect.value) return;

	const str = `/api/v1/teams/${teamSelect.value}`;
	const handler = (res) => {
		if (res.status === 'success') {
			console.log(res);
			color1.value = res.data.color1;
			color2.value = res.data.color2;
			color3.value = res.data.color3;
			color4.value = res.data.color4;
			handleColorChange({ target: color1 });

			teamName.value = res.data.name;
			teamSeason.value = res.data.season;

			getElementArray(division, 'option').some((op, i) => {
				if (op.value.toLowerCase() === res.data.division.toLowerCase()) {
					division.selectedIndex = i;
					return true;
				}
			});

			roster = res.data.roster;
		} else {
			showMessage('error', res.message);
		}
	};
	handleRequest(str, 'GET', null, handler);
};

document.addEventListener('DOMContentLoaded', (e) => {
	teamSelect.addEventListener('change', getTeam);

	color1.addEventListener('change', handleColorChange);
	color2.addEventListener('change', handleColorChange);
	color3.addEventListener('change', handleColorChange);
	color4.addEventListener('change', handleColorChange);

	rosterForm.addEventListener('submit', handleAddPlayer);
});
