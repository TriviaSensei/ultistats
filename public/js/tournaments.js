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
const bsc = new bootstrap.Collapse(`#tournament-info`);
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
		[infoItem, rulesItem].forEach((item) => {
			const b = item.querySelector('.accordion-button');
			if (b) {
				b.classList.add('collapsed');
				b.setAttribute('aria-expanded', 'false');
			}
			const c = item.querySelector('.accordion-collapse');
			if (c) c.classList.remove('show');
		});
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
						console.log(roster);
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
			console.log(f.value, tourney.format);
			if (f.value === tourney.format) {
				console.log(i);
				formatSelect.selectedIndex = i;
				return true;
			}
		});
		timeouts.selectedIndex = tourney.timeouts;

		rosterItem.classList.remove('invisible-div');
		gamesItem.classList.remove('invisible-div');
	} else {
		clearForm();
		rosterItem.classList.add('invisible-div');
		gamesItem.classList.add('invisible-div');
	}
	bsc.show();
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

	const str = `/api/v1/tournaments`;
	const handler = (res) => {
		if (res.status === 'success') {
			console.log(res.data);
			populateForm(tournamentForm, res.data);
			const op = createElement('option');
			op.setAttribute('value', res.data._id);
			const offset = new Date().getTimezoneOffset();
			const d = new Date(Date.parse(res.data.startDate) + offset * 60000);
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

			rosterItem.classList.remove('invisible-div');
			gamesItem.classList.remove('invisible-div');
		} else {
			showMessage('error', res.message);
		}
	};
	handleRequest(
		str,
		'POST',
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

document.addEventListener('DOMContentLoaded', () => {
	teamSelect.addEventListener('change', getTeam);
	tournamentSelect.addEventListener('change', getTournament);
	tournamentForm.addEventListener('submit', handleSaveTournament);
	gameTo.addEventListener('change', handleCap);
	winBy.addEventListener('change', handleCap);
	startDate.addEventListener('change', handleDates);
	endDate.addEventListener('change', handleDates);
	formatSelect.addEventListener('change', getFormat);
});
