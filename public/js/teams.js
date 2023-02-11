import { handleRequest } from './utils/requestHandler.js';
import { showMessage } from './utils/messages.js';
import { getElementArray } from './utils/getElementArray.js';
import { createElement } from './utils/createElementFromSelector.js';

const myId = document.querySelector('#my-id').value;

//team information
const rosterSize = document.querySelector('#roster-size');
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
const rosterHeader = document.querySelector('#roster-header');
const rosterBody = document.querySelector('#roster-list');
const fillerRow = document.querySelector('#filler-row');

//manager table
const managerTable = document.querySelector('#manager-table');
const managerList = document.querySelector('#manager-list');

//edit modal
const editPlayerModal = new bootstrap.Modal(
	document.getElementById('edit-player-modal')
);
//delete modal
const deletePlayerModal = new bootstrap.Modal(
	document.getElementById('confirm-delete-player-modal')
);
//leave team modal
const leaveTeamModal = new bootstrap.Modal(
	document.getElementById('confirm-leave-team-modal')
);
//cancel request modal
const cancelRequestModal = new bootstrap.Modal(
	document.getElementById('confirm-cancel-request-modal')
);

const deletePlayerId = document.querySelector('#delete-player-id');
const confirmDeletePlayerButton = document.querySelector(
	'#confirm-delete-player'
);
const addManagerButton = document.querySelector('#add-manager');
const confirmLeaveButton = document.querySelector('#confirm-leave-team');
const confirmCancelRequest = document.querySelector('#confirm-cancel-request');

const editPlayerForm = document.querySelector('#edit-player-form');
const editPlayerId = document.querySelector('#edit-player-id');
const editFirstName = document.querySelector('#edit-first-name');
const editLastName = document.querySelector('#edit-last-name');
const editDisplayName = document.querySelector('#edit-display-name');
const editNumber = document.querySelector('#edit-number');
const editPosition = document.querySelector('#edit-position');

const handleColorChange = (e) => {
	if (![color1, color2, color3, color4].includes(e.target)) return;

	pre1.style.color = color2.value;
	pre1.style.backgroundColor = color1.value;
	pre2.style.color = color4.value;
	pre2.style.backgroundColor = color3.value;
};

const updateRosterSize = () => {
	rosterSize.innerHTML = roster.length;
};

const sortRosterTable = () => {
	const sortByHeader = rosterHeader.querySelector('.active-sort');
	if (!sortByHeader) return;

	const sortBy = sortByHeader.getAttribute('data-attr');
	if (!sortBy) return;
	const asc = sortByHeader.classList.contains('sort-asc');

	roster = roster.sort((a, b) => {
		return (
			(asc ? 1 : -1) *
			a[sortBy].localeCompare(b[sortBy], undefined, {
				numeric: sortBy === 'number',
			})
		);
	});
	roster.forEach((p) => {
		const row = rosterBody.querySelector(`tr[data-id="${p.id}"]`);
		if (row) rosterBody.appendChild(row);
	});
};

const handleSortRoster = (e) => {
	//if we're already sorting here, just reverse the table
	if (e.target.classList.contains('active-sort')) {
		e.target.classList.toggle('sort-asc');
		e.target.classList.toggle('sort-desc');
	} else {
		const sc = rosterHeader.querySelector('.active-sort');
		if (sc) sc.classList.remove('active-sort', 'sort-asc', 'sort-desc');
		e.target.classList.add('active-sort', 'sort-asc');
	}
	sortRosterTable();
};

const removePlayerRow = (id) => {
	const row = document.querySelector(`tr[data-id="${id}"]`);
	if (row) row.remove();

	const rows = document.querySelector('.player-row');
	if (!rows) {
		if (fillerRow) fillerRow.classList.remove('invisible-div');
	}
};

const handleRemovePlayer = (e) => {
	if (e.target !== confirmDeletePlayerButton) return;
	const id = deletePlayerId.value;
	if (!id) return;

	if (teamSelect.value !== '') {
		const str = `/api/v1/teams/removePlayer/${teamSelect.value}`;
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
	updateRosterSize();
};

const confirmDeletePlayer = (e) => {
	const row = e.target.closest('tr');
	if (!row) return;

	const id = row.getAttribute('data-id');
	if (!id) return;

	deletePlayerId.value = id;
	deletePlayerModal.show();
};

const openEditModal = (e) => {
	const id = e.target.closest('tr')?.getAttribute('data-id');
	if (!id) return;

	const player = roster.find((p) => {
		return p.id === id;
	});
	if (!player) return;

	editPlayerId.value = id;
	editFirstName.value = player.firstName;
	editLastName.value = player.lastName;
	editDisplayName.value = player.displayName;
	editNumber.value = player.number;
	if (player.gender) {
		const r = document.querySelector(
			`input[type="radio"][name="edit-gender-match"][value="${player.gender}"]`
		);
		if (r) r.checked = true;
	}
	if (player.line) {
		const r = document.querySelector(
			`input[type="radio"][name="edit-line"][value="${player.line}"]`
		);
		if (r) r.checked = true;
	}
	if (player.position) {
		getElementArray(editPosition, 'option').some((op, i) => {
			if (op.value === player.position) {
				editPosition.selectedIndex = i;
				return true;
			}
		});
	}
	editPlayerModal.show();
};

const addPlayerRow = (player) => {
	if (!player) return;
	if (fillerRow) fillerRow.classList.add('invisible-div');

	const info = [
		player.number,
		`${player.lastName}, ${player.firstName}`,
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
	info.forEach((data, i) => {
		const newCell = createElement('td');
		if (i === 2) {
			newCell.classList.add('gen-cell');
		}
		newCell.innerHTML = data;
		newRow.appendChild(newCell);
	});

	const editCell = createElement('td');
	const editButton = createElement('button');
	editButton.setAttribute('type', 'button');
	editButton.innerHTML = '✏️';
	editCell.appendChild(editButton);
	editButton.addEventListener('click', openEditModal);
	newRow.appendChild(editCell);

	const deleteCell = createElement('td');
	const delButton = createElement('button');
	delButton.setAttribute('type', 'button');
	delButton.innerHTML = '❌';
	deleteCell.appendChild(delButton);
	newRow.appendChild(deleteCell);
	delButton.addEventListener('click', confirmDeletePlayer);

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
	sortRosterTable();
};

const addPlayer = (player) => {
	let message = 'Player added.';
	let status = 'info';

	const toPush = {
		...player,
		name: `${player.lastName}, ${player.firstName}`,
		id: window.crypto.randomUUID(),
	};

	//if we're creating a new team, we need to check client side if we're creating a duplicate player.
	if (teamSelect.value === '') {
		roster.some((p) => {
			if (p.name.toLowerCase() === player.name.toLowerCase()) {
				message = `A player with that name (${p.name}) has already been added to your team.`;
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
		updateRosterSize();
		showMessage(status, message, status === 'info' ? 500 : 2000);
	} else {
		const str = `/api/v1/teams/addPlayer/${teamSelect.value}`;
		const handler = (res) => {
			showMessage(res.status, res.message);
			if (res.status === 'success' || res.status === 'warning') {
				roster.push({
					...res.newPlayer,
					name: `${res.newPlayer.lastName}, ${res.newPlayer.firstName}`,
				});
				addPlayerRow(res.newPlayer);
				updateRosterSize();
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
			name: `${lastName.value}, ${firstName.value}`,
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

const handleEditPlayer = (e) => {
	if (e.target !== editPlayerForm) return;
	e.preventDefault();
	if (teamSelect.value === '') {
	} else {
		const str = `/api/v1/teams/editPlayer/${teamSelect.value}`;
		const body = {
			id: editPlayerId.value,
			firstName: editFirstName.value,
			lastName: editLastName.value,
			displayName: editDisplayName.value,
			number: editNumber.value,
			position: editPosition.value,
			gender: document.querySelector(
				'input[type="radio"][name="edit-gender-match"]:checked'
			)
				? document.querySelector(
						'input[type="radio"][name="edit-gender-match"]:checked'
				  ).value
				: '',
			line: document.querySelector(
				'input[type="radio"][name="edit-line"]:checked'
			)
				? document.querySelector(
						'input[type="radio"][name="edit-line"]:checked'
				  ).value
				: '',
			position: editPosition.value,
		};
		const handler = (res) => {
			if (res.status === 'fail') {
				showMessage('error', res.message);
			} else {
				showMessage(res.status, res.message);
				console.log(res);
				const row = rosterTable.querySelector(
					`tr[data-id="${res.modifiedPlayer.id}"]`
				);
				if (!row) return;
				const cells = getElementArray(row, `td`);
				row.setAttribute('data-number', res.modifiedPlayer.number);
				cells[0].innerHTML = res.modifiedPlayer.number;
				cells[1].innerHTML = `${res.modifiedPlayer.lastName}, ${res.modifiedPlayer.firstName}`;
				cells[2].innerHTML = res.modifiedPlayer.gender;
				cells[3].innerHTML = res.modifiedPlayer.line;
				cells[4].innerHTML = res.modifiedPlayer.position;

				roster.some((p) => {
					if (p.id === res.modifiedPlayer.id) {
						p.number = res.modifiedPlayer.number;
						p.firstName = res.modifiedPlayer.firstName;
						p.lastName = res.modifiedPlayer.lastName;
						p.name = `${res.modifiedPlayer.lastName}, ${res.modifiedPlayer.firstName}`;
						p.gender = res.modifiedPlayer.gender;
						p.line = res.modifiedPlayer.line;
						p.position = res.modifiedPlayer.position;
						return true;
					}
				});
				sortRosterTable();
			}
		};
		handleRequest(str, 'PATCH', body, handler);
	}
};

const addManagerRow = (manager, pending) => {
	const newRow = createElement('tr.manager-row');
	const cell1 = createElement('td');
	cell1.innerHTML = `${manager.lastName}, ${manager.firstName} ${
		pending ? '(Pending)' : ''
	}`;
	const cell2 = createElement('td');
	if (manager._id === myId) {
		const button = createElement('button');
		button.innerHTML = 'Leave';
		cell2.appendChild(button);
		button.addEventListener('click', () => {
			leaveTeamModal.show();
		});
	} else if (pending) {
		const button = createElement('button');
		button.innerHTML = 'Cancel Request';
		newRow.setAttribute('data-id', manager._id);
		cell2.appendChild(button);
		button.addEventListener('click', () => {
			document.querySelector('#cancel-request-id').value = manager._id;
			cancelRequestModal.show();
		});
	}
	newRow.appendChild(cell1);
	newRow.appendChild(cell2);
	managerList.appendChild(newRow);
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
		handleColorChange({ target: color1 });
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
			removePlayerRow(r.getAttribute('data-id'));
		});
		//empty the roster just in case
		roster = [];

		//remove the rows from the manager table (this should empty the roster)
		getElementArray(managerTable, '.manager-row').forEach((r) => {
			r.remove();
		});

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
			handleDivisionChange(null);

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
				p.name = `${p.lastName}, ${p.firstName}`;
				addPlayerRow(p);
			});
			updateRosterSize();

			getElementArray(managerTable, '.manager-row').forEach((r) => {
				r.remove();
			});

			res.data.managers = res.data.managers.sort((a, b) => {
				if (a._id === myId) return -1;
				else if (b._id === myId) return 1;
				else return 0;
			});

			res.data.managers.forEach((m) => {
				addManagerRow(m, false);
			});
			res.data.requestedManagers.forEach((m) => {
				addManagerRow(m, true);
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

const saveTeam = () => {
	const body = {
		name: teamName.value,
		season: parseInt(teamSeason.value),
		division: division.value,
		color1: color1.value,
		color2: color2.value,
		color3: color3.value,
		color4: color4.value,
	};
	let str = `/api/v1/teams/${teamSelect.value}`;
	let handler = (res) => {
		if (res.status === 'success') {
			showMessage('info', 'Successfully saved team.');
			getTeam({ target: teamSelect });
		} else {
			showMessage('error', res.message);
		}
	};
	handleRequest(str, 'PATCH', body, handler);
};

const handleSaveTeam = (e) => {
	if (e.target !== teamForm) return;
	e.preventDefault();

	if (teamSelect.value === '') {
		createTeam();
	} else {
		saveTeam();
	}
};

const setDisplayName = (e) => {
	if (e.target === firstName) {
		if (displayName.value === '') {
			displayName.value = firstName.value;
		}
	} else if (e.target === editFirstName) {
		if (editDisplayName.value === '') {
			editDisplayName.value = editFirstName.value;
		}
	}
};

const handleDivisionChange = (e) => {
	const gm = document.querySelector('#gender-match');
	const egm = document.querySelector('#edit-gender-match');
	if (division.value === 'Mixed') {
		gm.classList.remove('invisible-div');
		egm.classList.remove('invisible-div');
		rosterTable.classList.add('mixed');
	} else {
		gm.classList.add('invisible-div');
		egm.classList.add('invisible-div');
		rosterTable.classList.remove('mixed');
		const r = getElementArray(
			document,
			'input[type="radio"][name="gender-match"], input[type="radio"][name="edit-gender-match"]'
		);
		let checkedGen = division.value === 'Men' ? 'M' : 'F';
		r.forEach((el) => {
			el.checked = el.value === checkedGen;
		});
	}
};

const handleRequestManager = () => {
	if (!teamSelect.value)
		showMessage('error', 'You must save your team before adding a manager.');
	const str = `/api/v1/teams/addManager/${teamSelect.value}`;
	const body = {
		email: document.querySelector('#new-manager-email').value,
	};
	const handler = (res) => {
		if (res.status === 'success') {
			showMessage(
				'info',
				`An e-mail request has been sent to ${res.newManager.firstName} ${res.newManager.lastName}`
			);
			addManagerRow(res.newManager, true);
		} else {
			showMessage('error', res.message);
		}
	};
	handleRequest(str, 'PATCH', body, handler);
};

const cancelManagerRequest = () => {
	const id = document.querySelector('#cancel-request-id').value;
	if (!id) return;

	if (!teamSelect.value)
		showMessage(
			`error`,
			'You must create a team to add and remove managers from it.'
		);

	const str = `/api/v1/teams/cancelManager/${teamSelect.value}`;
	const body = {
		id,
	};
	const handler = (res) => {
		if (res.status === 'success') {
			showMessage('info', res.message);
			const row = document.querySelector(`tr.manager-row[data-id="${id}"]`);
			if (row) row.remove();
		} else showMessage('error', res.message);
	};
	handleRequest(str, 'PATCH', body, handler);
};

const handleLeaveTeam = () => {
	if (!teamSelect.value) return;

	const str = `/api/v1/teams/leaveTeam/${teamSelect.value}`;
	const handler = (res) => {
		showMessage('info', res.message);
		if (res.status === 'success') {
			teamSelect.querySelector(`option[value="${teamSelect.value}"]`).remove();
			teamSelect.selectedIndex = 0;
			getTeam({ target: teamSelect });
		}
	};
	handleRequest(str, 'PATCH', null, handler);
};

document.addEventListener('DOMContentLoaded', (e) => {
	teamSelect.addEventListener('change', getTeam);

	color1.addEventListener('change', handleColorChange);
	color2.addEventListener('change', handleColorChange);
	color3.addEventListener('change', handleColorChange);
	color4.addEventListener('change', handleColorChange);

	firstName.addEventListener('change', setDisplayName);
	editFirstName.addEventListener('change', setDisplayName);
	division.addEventListener('change', handleDivisionChange);

	rosterForm.addEventListener('submit', handleAddPlayer);
	editPlayerForm.addEventListener('submit', handleEditPlayer);
	teamForm.addEventListener('submit', handleSaveTeam);

	confirmDeletePlayerButton.addEventListener('click', handleRemovePlayer);

	const headers = getElementArray(rosterTable, 'th.sort-header');
	headers.forEach((h) => {
		h.addEventListener('click', handleSortRoster);
	});

	addManagerButton.addEventListener('click', handleRequestManager);
	confirmCancelRequest.addEventListener('click', cancelManagerRequest);
	confirmLeaveButton.addEventListener('click', handleLeaveTeam);
});
