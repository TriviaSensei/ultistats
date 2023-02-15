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
const rosterTable = document.querySelector('#tournament-roster-table');
const rosterHeader = rosterTable?.querySelector('thead');
const rosterBody = rosterTable?.querySelector('tbody');
const nonRosterSelect = document.querySelector('#non-roster-container');
const rosterSelect = document.querySelector('#tourney-roster-container');
const rosterCount = document.querySelector('#roster-count');
const moveOne = document.querySelector('#move-one');
const moveAll = document.querySelector('#move-all');

let tournaments = [];
let roster = [];
let tourneyRoster = [];
let tourneyLines = [];

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
						roster = res.data.roster;
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
		console.log(tourney);
		populateForm(tournamentForm, tourney);

		tourneyRoster = tourney.roster;

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

		tournamentInfo.show();
	} else {
		clearForm();
		rosterItem.classList.add('invisible-div');
		gamesItem.classList.add('invisible-div');
		tournamentInfo.hide();
		tournamentRules.hide();
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
		document,
		'#tournament-roster-form input[type="checkbox"]:checked'
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
});
