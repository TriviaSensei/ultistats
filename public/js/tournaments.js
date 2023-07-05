import { handleRequest } from './utils/requestHandler.js';
import { showMessage } from './utils/messages.js';
import { getElementArray } from './utils/getElementArray.js';
import { createElement } from './utils/createElementFromSelector.js';
import { populateForm } from './utils/populateForm.js';
import { createRosterOption, insertOption } from './utils/rosterOption.js';
import { randomUUID } from './utils/randomUUID.js';

const teamSelect = document.querySelector('#tourney-team-select');
const tournamentSelect = document.querySelector('#tournament-select');

const tooltipTriggerList = document.querySelectorAll(
	'[data-bs-toggle="tooltip"]'
);
const tooltipList = [...tooltipTriggerList].map(
	(tooltipTriggerEl) => new bootstrap.Tooltip(tooltipTriggerEl)
);

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
const genderArea = document.querySelector('#gender-ratio-inputs');
let maxPlayerCount;
let genderMax;

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
const editLinesForm = document.querySelector('#edit-lines-form');

const lineButton = document.querySelector('#modify-lines');
const lineSelect = document.querySelector('#line-select');
const lineName = document.querySelector('#line-name');
const availableContainer = document.querySelector('#available-container');
const lineContainer = document.querySelector('#line-container');
const moveLineButton = document.querySelector('#move-to-line');
const mixedCount = document.querySelector('#mixed-counts');
const mCount = document.querySelector('#m-count');
const fCount = document.querySelector('#f-count');
const lineCount = document.querySelector('#line-count');
const deleteLine = document.querySelector('#delete-line');
const confirmDeleteLine = document.querySelector('#confirm-delete-line');
const deleteLineModal = new bootstrap.Modal(
	document.querySelector('#delete-line-modal')
);
const editLinesModal = new bootstrap.Modal(
	document.querySelector('#edit-lines-modal')
);

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
			item.classList.add('d-none');
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
				const handler2 = (res2) => {
					if (res2.status === 'success') {
						if (res2.data.division.toLowerCase() === 'mixed') {
							rosterTable.classList.add('mixed');
							lineContainer.classList.add('mixed');
							mixedCount.classList.remove('d-none');
							genderArea.classList.remove('d-none');
						} else {
							rosterTable.classList.remove('mixed');
							lineContainer.classList.remove('mixed');
							mixedCount.classList.add('d-none');
							genderArea.classList.add('d-none');
						}

						//clear the roster table
						getElementArray(rosterBody, '.player-row').forEach((r) => {
							r.remove();
						});

						//set the available roster to the roster of the team
						roster = res2.data.roster.map((p) => {
							return {
								...p,
								name: `${p.lastName}, ${p.firstName}`,
							};
						});

						const offset = new Date().getTimezoneOffset();
						const now = Date.parse(new Date());
						const exp =
							Date.parse(res2.data.membershipExpires) + offset * 60000;

						if (now > exp) memLevel = 'Free';
						else memLevel = res2.data.membershipLevel;
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
		maxPlayerCount = tourney.format.players;
		genderMax = tourney.format.genderMax;
		populateForm(tournamentForm, tourney);
		const evt = new CustomEvent('load-tourney', { detail: tourney });
		document.dispatchEvent(evt);

		tourneyRoster = tourney.roster.map((p) => {
			return {
				...p,
				name: `${p.lastName}, ${p.firstName}`,
			};
		});

		tourneyLines = tourney.lines;
		tourneyLines.forEach((l) => {
			addLineOption(l);
		});
		sortLines();

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
			if (f.value === tourney.format._id) {
				formatSelect.selectedIndex = i;
				return true;
			}
		});
		timeouts.selectedIndex = tourney.timeouts;

		rosterItem.classList.remove('d-none');
		gamesItem.classList.remove('d-none');

		roster = roster.sort((a, b) => {
			const a1 = `${a.lastName}, ${a.firstName}`;
			const b1 = `${b.lastName}, ${b.firstName}`;
			return a1.localeCompare(b1);
		});

		//clear all roster/line options
		getElementArray(document, '.roster-option').forEach((op) => {
			op.remove();
		});

		let count = 0;
		roster.forEach((p) => {
			const op = createRosterOption(p, handleArrows);

			if (
				tourney.roster.some((p2) => {
					return p2.id === p.id;
				})
			) {
				if (!rosterSelect.querySelector(`.roster-option[data-id="${p.id}"]`))
					rosterSelect.appendChild(op);
				const op2 = createRosterOption(p, handleArrows);
				if (
					!availableContainer.querySelector(`.roster-option[data-id="${p.id}"]`)
				)
					availableContainer.appendChild(op2);
				count++;
			} else {
				if (!nonRosterSelect.querySelector(`.roster-option[data-id="${p.id}"]`))
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
		clearTourneyRosterTable();
		rosterItem.classList.add('d-none');
		gamesItem.classList.add('d-none');
		tournamentInfo.hide();
		tournamentRules.hide();
		tourneyRoster = [];
		tourneyLines = [];
	}
};

const handleLineButton = () => {
	if (memLevel === 'Free') {
		lineButton.disabled = true;
		lineButton.parentElement.setAttribute(
			'title',
			'Upgrade to a basic or plus membership to create preset lines'
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
	if (!formatSelect.value) return;

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
			const si =
				res.data[0].defaultTimeouts >= 0 ? res.data[0].defaultTimeouts : 4;
			timeouts.selectedIndex = si;
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
			console.log(res.data);
			populateForm(tournamentForm, res.data);
			const offset = new Date().getTimezoneOffset();
			const d = new Date(Date.parse(res.data.startDate) + offset * 60000);

			if (!tournamentSelect.value) {
				console.log(roster);
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
				timeouts.selectedIndex = res.data.timeouts;

				roster.forEach((p) => {
					const op = createRosterOption(p, handleArrows);
					insertOption(op, nonRosterSelect);
				});
			} else {
				const op = tournamentSelect.options[tournamentSelect.selectedIndex];
				if (op) {
					op.innerHTML = `${res.data.name} (${d.toLocaleDateString()})`;
				}
			}

			rosterItem.classList.remove('d-none');
			gamesItem.classList.remove('d-none');

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
			genderRule: document.querySelector(
				`input[type="radio"][name="gender-rule"]:checked`
			)?.value,
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

const handleMoveOne = (box) => {
	const style = getComputedStyle(box);
	if (style.display !== 'block') return;

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
		const style = getComputedStyle(b);
		b.checked = select && style.display === 'block';
	});
	if (boxes.length > 0 && select) handleArrows({ target: boxes[0] });
};

const handleArrows = (e) => {
	if (!e.target.checked) return;

	const container = e.target.closest('.player-container');
	if (container.classList.contains('left-side')) {
		moveOne.classList.add('move-right');
		moveOne.classList.remove('move-left');
		moveAll.classList.add('move-right');
		moveAll.classList.remove('move-left');
		moveLineButton.classList.add('move-right');
		moveLineButton.classList.remove('move-left');
		const other = container
			.closest('.input-group-h')
			?.querySelector('.right-side');
		if (other) checkAll(other, false);
	} else if (container.classList.contains('right-side')) {
		moveOne.classList.add('move-left');
		moveOne.classList.remove('move-right');
		moveAll.classList.add('move-left');
		moveAll.classList.remove('move-right');
		moveLineButton.classList.add('move-left');
		moveLineButton.classList.remove('move-right');
		checkAll(nonRosterSelect, false);
		const other = container
			.closest('.input-group-h')
			?.querySelector('.left-side');
		if (other) checkAll(other, false);
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
			const style = getComputedStyle(b);
			b.checked = style.display === 'block';
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

	//remove the player as an option in the available roster
	let name;
	roster = roster.filter((p) => {
		if (p.id === id) {
			name = p.name;
			return false;
		}
		return true;
	});
	//remove the player from the tourney roster, if they're on it
	tourneyRoster = tourneyRoster.filter((p) => {
		return p.id !== id;
	});
	//remove the player from any lines
	tourneyLines.forEach((line) => {
		line.players = line.players.filter((p) => {
			return p !== id;
		});
	});

	saveRoster(
		`${name} has been removed from the ${
			e.target === confirmRemoveFromRosterButton ? 'tournament' : ''
		}roster.`,
		null
	);

	const row = document.querySelector(`tr.tourney-roster-row[data-id="${id}"]`);
	if (row) row.remove();
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
	if (!tournamentSelect.value) return;
	const str = `/api/v1/tournaments/${tournamentSelect.value}`;
	const handler = (res) => {
		if (res.status === 'success') {
			showMessage('info', msg || res.message);
			getElementArray(rosterBody, 'tr.tourney-roster-row').forEach((r) => {
				removePlayerRow(r.getAttribute('data-id'));
			});
			//this shouldn't change anything, but we want to make sure the frontend data is the same as what the backend thinks it is.
			tourneyRoster = res.data.roster;
			tourneyLines = res.data.lines;

			tourneyRoster.forEach((p) => {
				addPlayerRow(p);
			});
			sortTournamentRosterTable();
			handleLineButton();

			//TODO: add/remove any players from the available list in the line selector
			//add players that aren't already there
			const ops = getElementArray(availableContainer, `.roster-option`);
			tourneyRoster.forEach((p) => {
				const op = availableContainer.querySelector(
					`.roster-option[data-id="${p.id}"]`
				);
				if (!op) {
					const newOpt = createRosterOption(p, handleArrows);
					if (
						!ops.some((o) => {
							if (p.name.localeCompare(o.getAttribute('data-name')) < 0) {
								if (
									!availableContainer.querySelector(
										`.roster-option[data-id="${p.id}"]`
									)
								)
									availableContainer.insertBefore(newOpt, o);
								return true;
							}
						})
					) {
						if (
							!availableContainer.querySelector(
								`.roster-option[data-id="${p.id}"]`
							)
						)
							availableContainer.appendChild(newOpt);
					}
				}
			});
			//remove players that are no longer there
			const ops2 = getElementArray(
				document,
				`#edit-lines-modal .roster-option`
			);
			ops2.forEach((o) => {
				const id = o.getAttribute('data-id');
				if (
					!tourneyRoster.some((p) => {
						return p.id === id;
					})
				) {
					o.remove();
				}
			});

			updateCounts();

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

//remove player from tournament roster (not main roster).
const confirmDeletePlayer = (e) => {
	if (e.target !== confirmRemoveFromRosterButton) return;
	const inp = document.querySelector('#remove-player-id');
	if (!inp || !inp.value) return;
	let msg;
	//take the player out of the tourney roster
	tourneyRoster = tourneyRoster.filter((p) => {
		if (p.id === inp.value) {
			msg = `${p.lastName}, ${p.firstName} removed from tournament roster.`;
			//move the player back to the "available" side on the roster selector
			const box = rosterSelect.querySelector(
				`input[type="checkbox"][data-id="${p.id}"]`
			);
			if (box) handleMoveOne(box);
			else console.log('did not move box');

			return false;
		}
		return true;
	});

	//remove the player from any lines
	tourneyLines.forEach((line) => {
		line.players = line.players.filter((p) => {
			return p !== inp.value;
		});
	});
	//remove the player option from the line selector
	const ops = getElementArray(
		document,
		`#edit-lines-modal .roster-option[data-id="${inp.value}"]`
	);
	ops.forEach((o) => {
		o.remove();
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
		newRow.setAttribute('data-id', randomUUID());
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

const handleAddPlayer = (e) => {
	if (e.target !== addPlayerForm) return;
	e.preventDefault();

	const player = {
		firstName: addFirstName.value,
		lastName: addLastName.value,
		name: `${addLastName.value}, ${addFirstName.value}`,
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
		if (res.status !== 'fail') {
			showMessage(res.status, res.message);
			roster.push(res.newPlayer);
			const op = createRosterOption(res.newPlayer, handleArrows);
			if (!rosterSelect.querySelector(`.roster-option[data-id="${p.id}"]`))
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

const handleFilter = (e) => {
	//get the classname to toggle and the containers to toggle it on
	const cn = e.target.getAttribute('data-toggle');
	const containers = getElementArray(
		document,
		e.target.getAttribute('data-target')
	);

	if (!cn || !containers.length === 0) return;

	if (e.target.checked)
		containers.forEach((c) => {
			c.classList.add(cn);
		});
	else
		containers.forEach((c) => {
			c.classList.remove(cn);
		});
};

const updateCounts = () => {
	const m = lineContainer.querySelectorAll(
		`.roster-option[data-gender="M"]`
	).length;
	const f = lineContainer.querySelectorAll(
		`.roster-option[data-gender="F"]`
	).length;
	const totalCount = lineContainer.querySelectorAll(`.roster-option`).length;

	mCount.innerHTML = m;
	fCount.innerHTML = f;
	lineCount.innerHTML = totalCount;
};

const handleMoveLine = (e) => {
	if (e.target !== moveLineButton) return;
	const first = e.target.classList.contains('move-right')
		? availableContainer
		: lineContainer;
	const second =
		first === availableContainer ? lineContainer : availableContainer;

	//get the boxes and options to move over
	const boxes = getElementArray(first, 'input[type="checkbox"]:checked');
	const opts = boxes.map((b) => {
		return b.closest('.roster-option');
	});

	//if we are adding to the line, we need to check if the ratios (default 4:3 either direction), or total line size (default 7) are being violated
	if (first === availableContainer) {
		if (
			lineContainer.querySelectorAll('.roster-option').length + opts.length >
			maxPlayerCount
		) {
			return showMessage(
				'error',
				`The maximum size of this line is ${maxPlayerCount}`
			);
		}
		//mixed ratio check
		if (lineContainer.classList.contains('mixed')) {
			const males = lineContainer.querySelectorAll(
				'.roster-option[data-gender="M"]'
			);
			const females = lineContainer.querySelectorAll(
				'.roster-option[data-gender="F"]'
			);

			if (
				males.length +
					opts.filter((o) => {
						return o.getAttribute('data-gender') === 'M';
					}).length >
				genderMax[0]
			) {
				return showMessage(
					'error',
					`You may have a maximum of ${Math.floor(
						genderMax[0]
					)} male-matching players on this line.`
				);
			} else if (
				females.length +
					opts.filter((o) => {
						return o.getAttribute('data-gender') === 'F';
					}).length >
				genderMax[1]
			) {
				return showMessage(
					'error',
					`You may have a maximum of ${Math.floor(
						genderMax[1]
					)} female-matching players on this line.`
				);
			}
		}
	}

	//for every checked option, move it over to the other container
	opts.forEach((o) => {
		insertOption(o, second);
		const b = o.querySelector('input[type="checkbox"]');
		if (b) b.checked = false;
	});

	//update the gender match counts and total counts
	updateCounts();
};

const sortLines = () => {
	const lines = getElementArray(lineSelect, 'option').sort((a, b) => {
		if (!a.getAttribute('data-name')) return -1;
		else if (!b.getAttribute('data-name')) return 1;

		return a
			.getAttribute('data-name')
			.localeCompare(b.getAttribute('data-name'));
	});

	lines.forEach((l) => {
		lineSelect.appendChild(l);
	});
};
const addLineOption = (data) => {
	const existing = lineSelect.querySelector(`option[data-id="${data.id}"]`);
	if (existing) {
		existing.innerHTML = data.name;
		existing.setAttribute('data-name', data.name);
	} else {
		const op = createElement('option');
		op.setAttribute('value', data.id);
		op.setAttribute('data-name', data.name);
		op.innerHTML = data.name;
		lineSelect.appendChild(op);
	}
};

const handleSaveLine = (e) => {
	if (e.target !== editLinesForm) return;
	e.preventDefault();

	const str = `/api/v1/tournaments/modifyLine/${tournamentSelect.value}`;
	const body = {
		id: lineSelect.value,
		name: lineName.value,
		players: getElementArray(lineContainer, '.roster-option').map((op) => {
			return {
				id: op.getAttribute('data-id'),
				name: op.getAttribute('data-name'),
			};
		}),
	};

	/**
	 * Expected result:
	 * {
	 * 	data: {
	 * 		id: line ID,
	 * 		name: line name,
	 * 		players: [
	 * 			list of IDs
	 * 		]
	 * 	}
	 * }
	 */
	const handler = (res) => {
		console.log(res);
		if (res.status === 'success') {
			if (
				res.data.id &&
				!tourneyLines.some((l) => {
					if (l.id === res.data.id) {
						l.name = res.data.name;
						l.players = res.data.players;
						const opt = lineSelect.querySelector(`option[value="${l.id}"]`);
						opt.innerHTML = l.name;
						showMessage('info', 'Successfully edited line.');
						return true;
					}
				})
			) {
				tourneyLines.push(res.data);
				addLineOption(res.data);
				sortLines();
				lineSelect.selectedIndex = getElementArray(
					lineSelect,
					'option'
				).findIndex((el) => {
					return el.value === res.data.id;
				});
				showMessage('info', 'Successfully added line.');
			}
		} else {
			showMessage('error', res.message);
		}
	};

	handleRequest(str, 'PATCH', body, handler);
};

const loadLine = (e) => {
	if (e.target !== lineSelect) return;
	//clear existing line
	getElementArray(lineContainer, '.roster-option').forEach((op) => {
		insertOption(op, availableContainer);
	});
	lineName.value = '';
	deleteLine.disabled = true;
	updateCounts();

	if (!lineSelect.value) return;
	deleteLine.disabled = false;

	const loadedLine = tourneyLines.find((l) => {
		return l.id === lineSelect.value;
	});
	if (!loadedLine) return;

	lineName.value = loadedLine.name;

	loadedLine.players.forEach((p) => {
		const op = availableContainer.querySelector(
			`.roster-option[data-id="${p}"]`
		);
		if (op) insertOption(op, lineContainer);
	});
	updateCounts();
};

const handleDeleteLine = (e) => {
	if (e.target !== confirmDeleteLine) return;

	if (!lineSelect.value) return;

	const opt = lineSelect.options[lineSelect.selectedIndex];
	const name = opt?.getAttribute('data-name');
	const str = `/api/v1/tournaments/deleteLine/${tournamentSelect.value}`;
	const body = {
		id: lineSelect.value,
	};
	const handler = (res) => {
		if (res.status === 'success') {
			showMessage(
				'info',
				name
					? `Successfully deleted line ${name}.`
					: 'Successfully deleted line.'
			);
			tourneyLines = res.data.lines;
			opt.remove();
			lineSelect.selectedIndex = 0;
			loadLine({ target: lineSelect });
			deleteLineModal.hide();
			editLinesModal.show();
		} else {
			showMessage('error', res.message);
		}
	};
	showMessage('info', 'Deleting line...');
	handleRequest(str, 'PATCH', body, handler);
};

const handleNewPlayer = (e) => {
	console.log(e.detail);
	if (teamSelect.value === e.detail.team) {
		console.log(roster);
		roster.push({
			...e.detail.player,
			name: `${e.detail.player.lastName}, ${e.detail.player.firstName}`,
		});
		const op = createRosterOption(e.detail.player, handleArrows);
		console.log(op);
		insertOption(op, nonRosterSelect);
	}
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

	const boxes = getElementArray(
		document,
		'.filter-panel input[type="checkbox"]'
	);
	boxes.forEach((b) => {
		handleFilter({ target: b });
		b.addEventListener('change', handleFilter);
	});

	moveLineButton.addEventListener('click', handleMoveLine);
	editLinesForm.addEventListener('submit', handleSaveLine);
	lineSelect.addEventListener('change', loadLine);
	confirmDeleteLine.addEventListener('click', handleDeleteLine);

	document.addEventListener('new-player', handleNewPlayer);
});
