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

		roster.forEach((p) => {
			const op = createElement('.roster-option');
			op.setAttribute('data-id', p.id);
			const cb = createElement('input');
			cb.setAttribute('id', `cb-${p.id}`);
			cb.setAttribute('type', 'checkbox');
			const lbl = createElement('label');
			lbl.setAttribute('for', cb.id);
			lbl.innerHTML = `${p.lastName}, ${p.firstName}`;
			op.appendChild(cb);
			op.appendChild(lbl);

			if (
				tourney.roster.some((p2) => {
					return p2.id === p.id;
				})
			) {
				rosterSelect.appendChild(op);
			} else {
				nonRosterSelect.appendChild(op);
			}
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

const testSelect = () => {
	const nrSelect = getElementArray(nonRosterSelect, 'option')
		.filter((o) => {
			return o.selected;
		})
		.map((o) => {
			return o.value;
		});

	const rSelect = getElementArray(rosterSelect, 'option')
		.filter((o) => {
			return o.selected;
		})
		.map((o) => {
			return o.value;
		});

	console.log(nrSelect);
	console.log(rSelect);
};

const handleMoveSome = (e) => {
	testSelect();
};

const handleMoveAll = (e) => {
	testSelect();
};

const handleArrows = (e) => {
	testSelect();
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
	nonRosterSelect.addEventListener('change', handleArrows);
	rosterSelect.addEventListener('change', handleArrows);
});
