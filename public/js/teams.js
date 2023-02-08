import { handleRequest } from './utils/requestHandler.js';
import { showMessage } from './utils/messages.js';
import { getElementArray } from './utils/getElementArray.js';
import { createElement } from './utils/createElementFromSelector.js';
//team information
const teamForm = document.querySelector('#team-form');
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
			if (res.status === 'success') {
				showMessage('info', res.message);
			} else {
				showMessage(res.status, res.message);
			}
		};
		handleRequest(str, 'PATCH', { id }, handler);
	} else {
		const p = roster.find((pl) => {
			return pl.id === id;
		});
		showMessage(
			'info',
			`Player ${p.lastName}, ${p.firstName} removed from roster.`
		);
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
			player.v > 1 ? '(' + player.v + ')' : ''
		}`,
		player.gender,
		player.line,
		player.position === 'Handler'
			? 'H'
			: player.position === 'Cutter'
			? 'C'
			: player.position === 'Hybrid'
			? 'Hy'
			: player.position,
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

	const toPush = { ...player, id: window.crypto.randomUUID() };

	//if we're creating a new team, we need to check client side if we're creating a duplicate player.
	if (teamSelect.value === '') {
		roster.some((p) => {
			if (
				p.firstName.toLowerCase() === player.firstName.toLowerCase() &&
				p.lastName.toLowerCase() === player.lastName.toLowerCase()
			) {
				message = `A player with that name (${req.body.lastName}, ${req.body.firstName}) has already been added to your team.`;
				status = 'error';
				return true;
			} else if (parseInt(p.number) === parseInt(player.number)) {
				message = `Number ${p.number} is already being worn by ${p.firstName} ${p.lastName}`;
				status = 'warning';
				return true;
			}
		});
		if (status === 'error') {
			return showMessage(status, message, 2000);
		}
		roster.push(toPush);
		addPlayerRow(toPush);
		showMessage(status, message, status === 'info' ? 500 : 2000);
	} else {
		const str = `/api/v1/teams/${teamSelect.value}/addPlayer`;
		const handler = (res) => {
			console.log(res);
			showMessage(res.status, res.message);
			if (res.status === 'success' || res.status === 'warning') {
				roster.push(res.newPlayer);
				addPlayerRow(res.newPlayer);
			}
		};
		handleRequest(str, 'PATCH', toPush, handler);
	}
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
	//if "create new team" is selected
	if (!teamSelect.value) {
		//reset the color values
		color1.value = '#ffffff';
		color2.value = '#000000';
		color3.value = '#000000';
		color4.value = '#ffffff';
		//...and the inputs
		[teamName, teamSeason, firstName, lastName, displayName, number].forEach(
			(i) => {
				i.value = '';
			}
		);

		getElementArray(rosterForm, `input[type="radio"]`).forEach((el) => {
			el.checked = false;
		});

		//remove the rows from the roster table (this should empty the roster)
		getElementArray(rosterBody, '.player-row').forEach((r) => {
			removePlayer(r.getAttribute('data-id'));
		});
		//empty the roster just in case
		roster = [];

		return;
	}

	//get the team info
	const str = `/api/v1/teams/${teamSelect.value}`;
	const handler = (res) => {
		if (res.status === 'success') {
			console.log(res);
			//set the colors;
			color1.value = res.data.color1;
			color2.value = res.data.color2;
			color3.value = res.data.color3;
			color4.value = res.data.color4;
			//set the jersey previews - invoking the function once will change everything
			handleColorChange({ target: color1 });

			//set the inputs
			teamName.value = res.data.name;
			teamSeason.value = res.data.season;

			getElementArray(division, 'option').some((op, i) => {
				if (op.value.toLowerCase() === res.data.division.toLowerCase()) {
					division.selectedIndex = i;
					return true;
				}
			});

			//clear the roster table (just the rows...don't want to accidentally clear the actual DB roster)
			getElementArray(rosterBody, '.player-row').forEach((r) => {
				if (r.getAttribute('data-id')) {
					removePlayerRow(r.getAttribute('data-id'));
				} else {
					r.remove();
				}
			});
			//set the roster to the roster of the team
			roster = res.data.roster;
			roster.forEach((p) => {
				addPlayerRow(p);
			});
		} else {
			showMessage('error', res.message);
		}
	};
	handleRequest(str, 'GET', null, handler);
};

const createTeam = () => {
	const body = {
		name: teamName.value,
		season: parseInt(teamSeason.value),
		division: division.value,
		color1: color1.value,
		color2: color2.value,
		color3: color3.value,
		color4: color4.value,
		roster,
	};
	let str = `/api/v1/teams/`;
	let handler = (res) => {
		if (res.status === 'success') {
			showMessage('info', 'Successfully created team.');
			const op = document.createElement('option');
			op.innerHTML = `${res.data.name} (${res.data.season})`;
			op.value = res.data._id;
			teamSelect.appendChild(op);
			teamSelect.selectedIndex =
				teamSelect.querySelectorAll('option').length - 1;
			getTeam({ target: teamSelect });
		}
	};
	handleRequest(str, 'POST', body, handler);
};

const saveTeam = () => {};

const handleSaveTeam = (e) => {
	if (e.target !== teamForm) return;
	e.preventDefault();

	if (teamSelect.value === '') {
		createTeam();
	} else {
		saveTeam();
	}
};

document.addEventListener('DOMContentLoaded', (e) => {
	teamSelect.addEventListener('change', getTeam);

	color1.addEventListener('change', handleColorChange);
	color2.addEventListener('change', handleColorChange);
	color3.addEventListener('change', handleColorChange);
	color4.addEventListener('change', handleColorChange);

	rosterForm.addEventListener('submit', handleAddPlayer);
	teamForm.addEventListener('submit', handleSaveTeam);
});
