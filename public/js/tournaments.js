import { handleRequest } from './utils/requestHandler.js';
import { showMessage } from './utils/messages.js';
import { getElementArray } from './utils/getElementArray.js';
import { createElement } from './utils/createElementFromSelector.js';
import { populateForm } from './utils/populateForm.js';

const teamSelect = document.querySelector('#tourney-team-select');
const tournamentSelect = document.querySelector('#tournament-select');

//accordion stuff
const accordion = document.querySelector('#tournament-accordion');
const rulesItem = document.querySelector('#rules-item');
const rulesButton = document.querySelector('#rules-button');
const infoItem = document.querySelector('#info-item');
const infoButton = document.querySelector('#info-button');
const rosterItem = document.querySelector('#roster-item');
const rosterButton = document.querySelector('#roster-button');
const gamesItem = document.querySelector('#games-item');
const gamesButton = document.querySelector('#games-button');

//tournament info
const tournamentInfo = new bootstrap.Collapse(`#tournament-info`, {
	toggle: false,
});
const tournamentRules = new bootstrap.Collapse('#tournament-rules', {
	toggle: false,
});
const tournamentForm = document.querySelector('#tournament-form');
const tournamentName = document.querySelector('#tournament-name');
const startDate = document.querySelector('#start-date');
const endDate = document.querySelector('#end-date');
const formatSelect = document.querySelector('#format-select');
const gameTo = document.querySelector('#point-cap');
const winBy = document.querySelector('#win-by');
const hardCap = document.querySelector('#hard-cap');
const timeouts = document.querySelector('#timeouts');

//roster info
const tournamentRosterModal = new bootstrap.Modal(
	document.querySelector('#tournament-roster-modal')
);
const tournamentRosterForm = document.querySelector('#tournament-roster-form');
const cancelSaveRosterButton = document.querySelector('#cancel-save-roster');
const deletePlayerId = document.querySelector('#delete-player-id');
const confirmDeletePlayerButton = document.querySelector(
	'#confirm-delete-player'
);
const rosterTable = document.querySelector('#tournament-roster-table');
const rosterHeader = rosterTable?.querySelector('thead');
const rosterBody = rosterTable?.querySelector('tbody');
const nonRosterSelect = document.querySelector('#non-roster-container');
const rosterSelect = document.querySelector('#tourney-roster-container');
const rosterCount = document.querySelector('#roster-count');
const moveOne = document.querySelector('#move-one');
const moveAll = document.querySelector('#move-all');
const fillerRow = document.querySelector('#tournament-filler-row');
const confirmRemoveFromRosterButton = document.querySelector(
	'#confirm-remove-from-roster'
);

let tournaments = [];
let roster = [];
let tourneyRoster = [];
let tourneyLines = [];

//adding player to roster on the fly
const addPlayerModal = new bootstrap.Modal(
	document.querySelector('#add-player-modal')
);
const addPlayerForm = document.querySelector('#add-player-form');
const addFirstName = document.querySelector('#add-first-name');
const addLastName = document.querySelector('#add-last-name');
const addDisplayName = document.querySelector('#add-display-name');
const addNumber = document.querySelector('#add-number');
const addPosition = document.querySelector('#add-position');

//edit player on roster
const editPlayerModal = new bootstrap.Modal(
	document.querySelector('#edit-rostered-player-modal')
);
const editPlayerForm = document.querySelector('#edit-rostered-player-form');
const editFirstName = document.querySelector('#edit-roster-first-name');
const editLastName = document.querySelector('#edit-roster-last-name');
const editDisplayName = document.querySelector('#edit-roster-display-name');
const editNumber = document.querySelector('#edit-roster-number');
const editPosition = document.querySelector('#edit-roster-position');

//modify lines
let memLevel;
const lineButton = document.querySelector('#modify-lines');

const removeTourneys = () => {
	getElementArray(tournamentSelect, 'option').forEach((o, i) => {
		if (i !== 0) o.remove();
	});
};

const clearForm = () => {
	tournamentName.value = '';
	startDate.value = '';
	endDate.value = '';
	gameTo.value = '';
	winBy.value = '';
	hardCap.value = '';
	timeouts.selectedIndex = 4;
	formatSelect.selectedIndex = 0;
};

const clearTourneyRosterTable = () => {
	const rows = getElementArray(rosterBody, '.tourney-roster-row');
	rows.forEach((r) => {
		r.remove();
	});
	fillerRow.classList.remove('invisible-div');
};

const getTeam = (e) => {
	if (e.target !== teamSelect) return;
	//if "create new team" is selected
	if (!teamSelect.value) {
		removeTourneys();
		tournamentSelect.selectedIndex = 0;
		tournamentSelect.disabled = true;
		infoButton.disabled = true;
		rulesButton.disabled = true;
		[rosterItem, gamesItem].forEach((item) => {
			item.classList.add('invisible-div');
		});
		tournamentInfo.hide();
		tournamentRules.hide();
	} else {
		const str = `/api/v1/teams/tournaments/${teamSelect.value}`;
		const handler = (res) => {
			if (res.status === 'success') {
				tournamentSelect.disabled = false;
				removeTourneys();
				clearForm();
				infoButton.disabled = false;
				rulesButton.disabled = false;
				tournaments = res.data;
				res.data.forEach((t) => {
					const op = createElement('option');
					op.setAttribute('value', t._id);
					const offset = new Date().getTimezoneOffset();
					const d = new Date(Date.parse(t.startDate) + offset * 60000);
					op.innerHTML = `${t.name} (${d.toLocaleDateString()})`;
					op.setAttribute('data-date', d.toISOString().split('T')[0]);
					tournamentSelect.appendChild(op);
				});
				const str2 = `/api/v1/teams/${teamSelect.value}`;
				const handler2 = (res) => {
					if (res.status === 'success') {
						if (res.data.division.toLowerCase() === 'mixed') {
							rosterTable.classList.add('mixed');
						} else {
							rosterTable.classList.remove('mixed');
						}

						//clear the roster table
						getElementArray(rosterBody, '.player-row').forEach((r) => {
							r.remove();
						});

						//set the available roster to the roster of the team
						roster = res.data.roster.map((p) => {
							return {
								...p,
								name: `${p.lastName}, ${p.firstName}`,
							};
						});

						memLevel = res.data.membershipLevel;
					} else {
						showMessage('error', res.message);
					}
				};
				handleRequest(str2, 'GET', null, handler2);
			} else {
				showMessage('error', res.message);
			}
		};
		handleRequest(str, 'GET', null, handler);
	}
};

const getTournament = (e) => {
	if (e.target !== tournamentSelect) return;

	if (tournamentSelect.value) {
		const tourney = tournaments.find((t) => {
			return t._id === tournamentSelect.value;
		});

		if (!tourney) return showMessage('error', 'Tournament not found.');
		populateForm(tournamentForm, tourney);

		tourneyRoster = tourney.roster.map((p) => {
			return {
				...p,
				name: `${p.lastName}, ${p.firstName}`,
			};
		});

		handleLineButton();

		const offset = new Date().getTimezoneOffset();
		const d1 = new Date(Date.parse(tourney.startDate) + offset * 60000)
			.toISOString()
			.split('T')[0];
		const d2 = new Date(Date.parse(tourney.endDate) + offset * 60000)
			.toISOString()
			.split('T')[0];

		startDate.value = d1;
		endDate.value = d2;

		const fmts = getElementArray(formatSelect, 'option');
		fmts.some((f, i) => {
			if (f.value === tourney.format) {
				formatSelect.selectedIndex = i;
				return true;
			}
		});
		timeouts.selectedIndex = tourney.timeouts;

		rosterItem.classList.remove('invisible-div');
		gamesItem.classList.remove('invisible-div');

		roster = roster.sort((a, b) => {
			const a1 = `${a.lastName}, ${a.firstName}`;
			const b1 = `${b.lastName}, ${b.firstName}`;
			return a1.localeCompare(b1);
		});

		let count = 0;
		roster.forEach((p) => {
			const name = `${p.lastName}, ${p.firstName}`;
			const op = createElement('.roster-option');
			op.setAttribute('data-id', p.id);
			op.setAttribute('data-name', name);
			const cb = createElement('input');
			cb.setAttribute('id', `cb-${p.id}`);
			cb.setAttribute('type', 'checkbox');
			cb.addEventListener('change', handleArrows);
			const lbl = createElement('label');
			lbl.setAttribute('for', cb.id);
			lbl.innerHTML = name;
			op.appendChild(cb);
			op.appendChild(lbl);

			if (
				tourney.roster.some((p2) => {
					return p2.id === p.id;
				})
			) {
				rosterSelect.appendChild(op);
				count++;
			} else {
				nonRosterSelect.appendChild(op);
			}

			rosterCount.innerHTML = count;
		});

		clearTourneyRosterTable();
		tourneyRoster.forEach((p, i) => {
			addPlayerRow(p);
		});
		sortTournamentRosterTable();

		tournamentInfo.show();
	} else {
		clearForm();
		rosterItem.classList.add('invisible-div');
		gamesItem.classList.add('invisible-div');
		tournamentInfo.hide();
		tournamentRules.hide();
	}
};

const handleLineButton = () => {
	if (memLevel === 'Free') {
		lineButton.disabled = true;
		lineButton.parentElement.setAttribute(
			'title',
			'Upgrade to a basic or plus membership to '
		);
	} else if (tourneyRoster.length >= 8) {
		lineButton.disabled = false;
		lineButton.parentElement.setAttribute('title', '');
	} else {
		lineButton.disabled = true;
		lineButton.parentElement.setAttribute(
			'title',
			'You must add at least 8 players to the roster to set lines.'
		);
	}
};

const getFormat = (e) => {
	if (e.target !== formatSelect) return;

	const str = `/api/v1/formats/${formatSelect.value}`;
	const handler = (res) => {
		if (res.status === 'success') {
			const ops = getElementArray(formatSelect, 'option');
			ops.some((o, i) => {
				if (o.value === res.data[0]._id) {
					formatSelect.selectedIndex = i;
					return true;
				}
			});

			gameTo.value = res.data[0].defaultPointCap;
			winBy.value = 1;
			hardCap.value = res.data[0].defaultPointCap;
			timeouts.selectIndex =
				res.data[0].defaultTimeouts >= 0 ? res.data[0].defaultTimeouts : 4;
		}
	};
	handleRequest(str, 'GET', null, handler);
};

const handleSaveTournament = (e) => {
	if (e.target !== tournamentForm) return;
	e.preventDefault();

	const str = `/api/v1/tournaments${
		tournamentSelect.value ? `/${tournamentSelect.value}` : ''
	}`;
	const handler = (res) => {
		if (res.status === 'success') {
			populateForm(tournamentForm, res.data);
			const offset = new Date().getTimezoneOffset();
			const d = new Date(Date.parse(res.data.startDate) + offset * 60000);

			if (!tournamentSelect.value) {
				const op = createElement('option');
				op.setAttribute('value', res.data._id);
				op.innerHTML = `${res.data.name} (${d.toLocaleDateString()})`;
				op.setAttribute('data-date', d.toISOString().split('T')[0]);
				const ops = getElementArray(tournamentSelect, 'option');
				if (
					!ops.some((o, i) => {
						if (i === 0) return false;
						if (
							op
								.getAttribute('data-date')
								.localeCompare(o.getAttribute('data-date')) <= 0
						) {
							tournamentSelect.insertBefore(op, o);
							tournamentSelect.selectIndex = i;
							return true;
						}
					})
				) {
					tournamentSelect.appendChild(op);
					tournamentSelect.selectedIndex = ops.length;
				}
				const d1 = new Date(Date.parse(res.data.startDate) + offset * 60000)
					.toISOString()
					.split('T')[0];
				const d2 = new Date(Date.parse(res.data.endDate) + offset * 60000)
					.toISOString()
					.split('T')[0];

				startDate.value = d1;
				endDate.value = d2;

				const fmts = getElementArray(formatSelect, 'option');
				fmts.some((f, i) => {
					if (f.value === res.data.format) {
						formatSelect.selectedIndex = i;
						return true;
					}
				});
				timeouts.selectedIndex = tourney.timeouts;
			} else {
				const op = tournamentSelect.options[tournamentSelect.selectedIndex];
				if (op) {
					op.innerHTML = `${res.data.name} (${d.toLocaleDateString()})`;
				}
			}

			rosterItem.classList.remove('invisible-div');
			gamesItem.classList.remove('invisible-div');

			showMessage('info', 'Successfully saved tournament.');
		} else {
			showMessage('error', res.message);
		}
	};
	handleRequest(
		str,
		tournamentSelect.value ? 'PATCH' : 'POST',
		{
			team: teamSelect.value,
			name: tournamentName.value,
			startDate: startDate.value,
			endDate: endDate.value,
			format: formatSelect.value,
			cap: gameTo.value,
			winBy: winBy.value,
			hardCap: hardCap.value,
			timeouts: parseInt(timeouts.value),
		},
		handler
	);
};

const handleCap = () => {
	//if win by 1, then hard cap is just the same as the normal point cap
	if (parseInt(winBy.value) === 1) {
		hardCap.disabled = true;
		hardCap.value = gameTo.value;
	} else {
		//if win by 2, the hard cap should be at least the cap + 1.
		hardCap.disabled = false;
		hardCap.setAttribute('min', parseInt(gameTo.value) + 1);
		hardCap.value = Math.max(
			parseInt(hardCap.value),
			parseInt(gameTo.value) + 1
		);
	}
};

const handleDates = () => {
	if (startDate.value) {
		endDate.setAttribute('min', startDate.value);
	} else {
		endDate.setAttribute('min', '');
	}

	if (endDate.value) {
		startDate.setAttribute('max', endDate.value);
	} else {
		startDate.setAttribute('max', '');
	}
};

const insertOption = (op, container) => {
	//figure out where to insert the option (they're sorted alphabetically)
	const otherOptions = getElementArray(container, '.roster-option');
	if (
		!otherOptions.some((o) => {
			const otherName = o.getAttribute('data-name');
			if (op.getAttribute('data-name').localeCompare(otherName) <= 0) {
				container.insertBefore(op, o);
				return true;
			}
		})
	) {
		container.appendChild(op);
	}
};

const handleMoveOne = (box) => {
	//get the parent container and the target (other) container
	const parent = box.closest('.player-container');
	if (!parent) return;
	const other =
		parent === nonRosterSelect
			? rosterSelect
			: parent === rosterSelect
			? nonRosterSelect
			: undefined;
	if (!other) return;

	//get the option to move over
	const op = box.closest('.roster-option');
	if (!op) return;

	//insert the option into the other box
	insertOption(op, other);

	//uncheck the box
	box.checked = false;

	//update the roster

	//update roster count, set arrows if one box is empty
	const nrCount = nonRosterSelect.querySelectorAll('.roster-option').length;
	const rCount = rosterSelect.querySelectorAll('.roster-option').length;
	rosterCount.innerHTML = rCount;
	if (rCount === 0) {
		moveOne.classList.add('move-right');
		moveOne.classList.remove('move-left');
		moveAll.classList.add('move-right');
		moveAll.classList.remove('move-left');
	} else if (nrCount === 0) {
		moveOne.classList.add('move-left');
		moveOne.classList.remove('move-right');
		moveAll.classList.add('move-left');
		moveAll.classList.remove('move-right');
	}
};

const handleMoveSome = (e) => {
	const selected = getElementArray(
		tournamentRosterForm,
		'input[type="checkbox"]:checked'
	);

	if (selected.length === 0) return;

	//verify that they're all in the same box
	if (
		!selected.every((b, i) => {
			return (
				b.closest('.player-container') ===
				selected[0].closest('.player-container')
			);
		})
	) {
		return showMessage(
			'error',
			'Cannot move players from both boxes simultaneously'
		);
	}

	selected.forEach((b) => {
		handleMoveOne(b);
	});
};

const handleMoveAll = (e) => {
	const first = moveAll.classList.contains('move-right')
		? nonRosterSelect
		: rosterSelect;

	checkAll(first, true);

	handleMoveSome(null);
};

const checkAll = (tgt, select) => {
	const boxes = getElementArray(tgt, 'input[type="checkbox"]');
	boxes.forEach((b) => {
		b.checked = select;
	});
	if (boxes.length > 0 && select) handleArrows({ target: boxes[0] });
};

const handleArrows = (e) => {
	if (!e.target.checked) return;

	const container = e.target.closest('.player-container');
	if (container === nonRosterSelect) {
		moveOne.classList.add('move-right');
		moveOne.classList.remove('move-left');
		moveAll.classList.add('move-right');
		moveAll.classList.remove('move-left');
		checkAll(rosterSelect, false);
	} else if (container === rosterSelect) {
		moveOne.classList.add('move-left');
		moveOne.classList.remove('move-right');
		moveAll.classList.add('move-left');
		moveAll.classList.remove('move-right');
		checkAll(nonRosterSelect, false);
	}
};

const handleSelectAll = (e) => {
	const parent = document.querySelector(e.target.getAttribute('data-target'));
	if (!parent) return;

	const other =
		parent === rosterSelect
			? nonRosterSelect
			: parent === nonRosterSelect
			? rosterSelect
			: undefined;
	if (!other) return;

	const boxes = getElementArray(parent, 'input[type="checkbox"]');
	const otherBoxes = getElementArray(other, 'input[type="checkbox"]');

	if (e.target.classList.contains('select-all')) {
		boxes.forEach((b) => {
			b.checked = true;
		});
		otherBoxes.forEach((b) => {
			b.checked = false;
		});
		handleArrows({ target: boxes[0] });
	} else if (e.target.classList.contains('select-none')) {
		boxes.forEach((b) => {
			b.checked = false;
		});
	}
};

const handleRemovePlayer = (e) => {
	if (
		e.target !== confirmDeletePlayerButton &&
		e.target !== confirmRemoveFromRosterButton
	)
		return;
	const id = deletePlayerId.value;
	if (!id) return;

	const op = document.querySelector(`.roster-option[data-id="${id}"]`);
	if (op) op.remove();

	roster = roster.filter((p) => {
		return p.id !== id;
	});
	tourneyRoster = tourneyRoster.filter((p) => {
		return p.id !== id;
	});

	handleLineButton();

	const row = document.querySelector(`tr.tourney-roster-row[data-id="${id}"]`);
	if (row) row.remove();

	const rows = document.querySelector('.tourney-roster-row');
	if (!rows) {
		if (fillerRow) fillerRow.classList.remove('invisible-div');
	}
};

const cancelSaveRoster = (e) => {
	//remove any non-rostered players from the roster list
	const ops = getElementArray(rosterSelect, '.roster-option');
	ops.forEach((o) => {
		if (
			!tourneyRoster.some((p) => {
				return p.id === o.getAttribute('data-id');
			})
		) {
			insertOption(o, nonRosterSelect);
		}
	});

	//move all rostered players who were removed back to the roster list
	tourneyRoster.forEach((p) => {
		const op = nonRosterSelect.querySelector(
			`.roster-option[data-id="${p.id}"]`
		);
		if (op) insertOption(op, rosterSelect);
	});

	const rCount = rosterSelect.querySelectorAll('.roster-option').length;
	rosterCount.innerHTML = rCount;
};

const saveRoster = (msg, after) => {
	const str = `/api/v1/tournaments/${tournamentSelect.value}`;
	const handler = (res) => {
		if (res.status === 'success') {
			showMessage('info', msg || res.message);
			getElementArray(rosterBody, 'tr.tourney-roster-row').forEach((r) => {
				removePlayerRow(r.getAttribute('data-id'));
			});
			tourneyRoster.forEach((p) => {
				addPlayerRow(p);
			});
			sortTournamentRosterTable();
			handleLineButton();
			if (after) after();
		} else {
			showMessage('error', res.message);
		}
	};
	handleRequest(
		str,
		'PATCH',
		{ roster: tourneyRoster, lines: tourneyLines },
		handler
	);
};

const handleSaveRoster = (e) => {
	if (e.target !== tournamentRosterForm) return;
	e.preventDefault();

	const ops = getElementArray(rosterSelect, '.roster-option').map((o) => {
		return {
			id: o.getAttribute('data-id'),
			name: o.getAttribute('data-name'),
		};
	});
	tourneyRoster = roster.filter((p) => {
		return ops.some((o) => {
			return o.id === p.id;
		});
	});
	tourneyLines.forEach((line) => {
		if (!line.players) return;
		line.players = line.players.filter((p) => {
			return tourneyRoster.some((p2) => {
				return p2.id === p;
			});
		});
	});

	saveRoster('Tournament roster saved', null);
};

const sortTournamentRosterTable = () => {
	const sortByHeader = rosterHeader.querySelector('.active-sort');
	if (!sortByHeader) return;

	const sortBy = sortByHeader.getAttribute('data-attr');
	if (!sortBy) return;
	const asc = sortByHeader.classList.contains('sort-asc');

	tourneyRoster = tourneyRoster.sort((a, b) => {
		return (
			(asc ? 1 : -1) *
			a[sortBy].localeCompare(b[sortBy], undefined, {
				numeric: sortBy === 'number',
			})
		);
	});
	tourneyRoster.forEach((p) => {
		const row = rosterBody.querySelector(`tr[data-id="${p.id}"]`);
		if (row) rosterBody.appendChild(row);
	});
};

const removePlayerRow = (id) => {
	const row = rosterBody.querySelector(
		`tr.tourney-roster-row[data-id="${id}"]`
	);
	if (row) row.remove();
	const rows = rosterBody.querySelector(`tr.tourney-roster-row`);
	if (!rows) {
		if (fillerRow) fillerRow.classList.remove('invisible-div');
	}
};

const setDeleteId = (e) => {
	const inp = document.querySelector('#remove-player-id');
	inp.value = e.target.getAttribute('data-id');

	const nameSpan = document.querySelector('#remove-player-name');
	const player = tourneyRoster.find((p) => {
		return p.id === inp.value;
	});

	if (!player) return;

	nameSpan.innerHTML = `${player.lastName}, ${player.firstName}`;
};

const confirmDeletePlayer = (e) => {
	if (e.target !== confirmRemoveFromRosterButton) return;
	const inp = document.querySelector('#remove-player-id');
	if (!inp || !inp.value) return;
	let msg;
	tourneyRoster = tourneyRoster.filter((p) => {
		if (p.id === inp.value) {
			msg = `${p.lastName}, ${p.firstName} removed from tournament roster.`;
			const box = document.querySelector(`input#cb-${p.id}[type="checkbox"]`);
			handleMoveOne(box);
			return false;
		}
		return true;
	});

	saveRoster(msg, null);
};

const setEditId = (e) => {
	const inp = document.querySelector('#edit-player-id');
	inp.value = e.target.getAttribute('data-id');

	const player = tourneyRoster.find((p) => {
		return p.id === inp.value;
	});

	if (!player) return;

	populateForm(editPlayerForm, player);

	getElementArray(editPlayerForm, 'input[type="radio"]').forEach((el) => {
		el.checked = false;
	});

	if (player.gender) {
		const r = editPlayerForm.querySelector(
			`input[type="radio"][value="${player.gender}"]`
		);
		if (r) r.checked = true;
	}

	if (player.line) {
		const r = editPlayerForm.querySelector(
			`input[type="radio"][value="${player.line}"]`
		);
		if (r) r.checked = true;
	}

	const opts = getElementArray(
		editPlayerForm,
		'#edit-roster-position > option'
	);
	if (opts.length > 0 && player.position) {
		opts.some((o, i) => {
			if (o.value === player.position) {
				o.parentElement.selectedIndex = i;
				return true;
			}
		});
	}
};

const addPlayerRow = (player) => {
	if (!player) return;
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

	const newRow = createElement('tr.tourney-roster-row');
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
	editButton.setAttribute('data-id', player.id);
	editButton.setAttribute('data-bs-toggle', 'modal');
	editButton.setAttribute('data-bs-target', '#edit-rostered-player-modal');
	editCell.appendChild(editButton);
	editButton.addEventListener('click', setEditId);
	newRow.appendChild(editCell);

	const deleteCell = createElement('td');
	const delButton = createElement('button');
	delButton.setAttribute('type', 'button');
	delButton.innerHTML = '❌';
	delButton.setAttribute('data-id', player.id);
	delButton.setAttribute('data-bs-toggle', 'modal');
	delButton.setAttribute('data-bs-target', '#confirm-remove-player-modal');
	deleteCell.appendChild(delButton);
	newRow.appendChild(deleteCell);
	delButton.addEventListener('click', setDeleteId);

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
	if (fillerRow) fillerRow.classList.add('invisible-div');
};

const handleAddPlayer = (e) => {
	if (e.target !== addPlayerForm) return;
	e.preventDefault();

	const player = {
		firstName: addFirstName.value,
		lastName: addLastName.value,
		displayName: addDisplayName.value,
		number: addNumber.value,
		gender: addPlayerForm.querySelector(
			'input[name="add-gender-match"]:checked'
		)?.value,
		line: addPlayerForm.querySelector('input[name="add-line"]:checked')?.value,
		position: addPosition.value,
	};

	const str = `/api/v1/teams/addPlayer/${teamSelect.value}`;
	const handler = (res) => {
		console.log(res);
		if (res.status !== 'fail') {
			showMessage(res.status, res.message);
			const name = `${res.newPlayer.lastName}, ${res.newPlayer.firstName}`;
			const op = createElement('.roster-option');
			op.setAttribute('data-id', res.newPlayer.id);
			op.setAttribute('data-name', name);
			const cb = createElement('input');
			cb.setAttribute('id', `cb-${res.newPlayer.id}`);
			cb.setAttribute('type', 'checkbox');
			cb.addEventListener('change', handleArrows);
			const lbl = createElement('label');
			lbl.setAttribute('for', cb.id);
			lbl.innerHTML = name;
			op.appendChild(cb);
			op.appendChild(lbl);
			insertOption(op, rosterSelect);
			rosterCount.innerHTML =
				rosterSelect.querySelectorAll('.roster-option').length;
			addPlayerModal.hide();
			tournamentRosterModal.show();
		} else {
			showMessage(res.status, res.message);
		}
	};
	handleRequest(str, 'PATCH', player, handler);
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
	sortTournamentRosterTable();
};

const handleEditPlayer = (e) => {
	if (e.target !== editPlayerForm) return;
	e.preventDefault();

	const inp = document.querySelector('#edit-player-id');
	if (!inp) return;
	console.log(`editing player ${inp.value}`);

	tourneyRoster.some((p) => {
		if (p.id === inp.value) {
			p.firstName = editFirstName.value;
			p.lastName = editLastName.value;
			p.displayName = editDisplayName.value;
			p.number = editNumber.value;
			p.gender = editPlayerForm.querySelector(
				`input[type="radio"][name="edit-roster-gender-match"]:checked`
			)?.value;
			p.line = editPlayerForm.querySelector(
				`input[type="radio"][name="edit-roster-line"]:checked`
			)?.value;
			p.position = editPosition.value;
			return true;
		}
	});

	saveRoster(
		`Player ${editLastName.value}, ${editFirstName.value} saved.`,
		() => {
			editPlayerModal.hide();
		}
	);
};

document.addEventListener('DOMContentLoaded', () => {
	teamSelect.addEventListener('change', getTeam);
	tournamentSelect.addEventListener('change', getTournament);
	tournamentForm.addEventListener('submit', handleSaveTournament);
	gameTo.addEventListener('change', handleCap);
	winBy.addEventListener('change', handleCap);
	startDate.addEventListener('change', handleDates);
	endDate.addEventListener('change', handleDates);
	formatSelect.addEventListener('change', getFormat);
	moveOne.addEventListener('click', handleMoveSome);
	moveAll.addEventListener('click', handleMoveAll);
	getElementArray(document, '.select-all,.select-none').forEach((b) => {
		b.addEventListener('click', handleSelectAll);
	});
	confirmDeletePlayerButton.addEventListener('click', handleRemovePlayer);
	tournamentRosterForm.addEventListener('submit', handleSaveRoster);
	cancelSaveRosterButton.addEventListener('click', cancelSaveRoster);
	addPlayerForm.addEventListener('submit', handleAddPlayer);
	confirmRemoveFromRosterButton.addEventListener('click', confirmDeletePlayer);
	const headers = getElementArray(rosterTable, 'th.sort-header');
	headers.forEach((h) => {
		h.addEventListener('click', handleSortRoster);
	});
	editPlayerForm.addEventListener('submit', handleEditPlayer);
});
