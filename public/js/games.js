import { handleRequest } from './utils/requestHandler.js';
import { showMessage } from './utils/messages.js';
import { getElementArray } from './utils/getElementArray.js';
import { createElement } from './utils/createElementFromSelector.js';
import { populateForm } from './utils/populateForm.js';

let event;
let games = [];

const editGameModal = new bootstrap.Modal(
	document.querySelector('#edit-game-modal')
);

const gameBody = document.querySelector('#game-table-body');
const addGameForm = document.querySelector('#add-game-form');
const roundSelect = document.querySelector('#round-select');
const oppName = document.querySelector('#opponent');
const gameCap = document.querySelector('#game-point-cap');
const winBy = document.querySelector('#game-win-by');
const gameHardCap = document.querySelector('#game-hard-cap');
const gameTimeouts = document.querySelector('#game-timeouts');
let roundOrder;

const editGameForm = document.querySelector('#edit-game-form');
const editRoundSelect = document.querySelector('#edit-round-select');
const editOpponent = document.querySelector('#edit-opponent');
const editCap = document.querySelector('#edit-game-point-cap');
const editWinBy = document.querySelector('#edit-game-win-by');
const editHardCap = document.querySelector('#edit-game-hard-cap');
const confirmEdit = document.querySelector('#confirm-edit-game');
const cancelEdit = document.querySelector('#cancel-edit-game');

const compareRounds = (order) => {
	return (a, b) => {
		const a1 = order.findIndex((o) => {
			return a.round === o;
		});
		const b1 = order.findIndex((o) => {
			return b.round === o;
		});
		return a1 - b1;
	};
};

const toOrdinal = (n) => {
	const m = n % 100;
	if (m === 11 || m === 12 || m === 13) return `${n}th`;
	else if (m % 10 === 1) return `${n}st`;
	else if (m % 10 === 2) return `${n}nd`;
	else if (m % 10 === 3) return `${n}rd`;
	else return `${n}th`;
};

const loadGameInfo = (e) => {
	const row = e.target.closest('.game-row');
	if (!row) return;

	const g = games.find((gm) => {
		return gm._id === row.getAttribute('data-id');
	});
	if (!g) return;
	populateForm(editGameForm, g);
	editGameForm.setAttribute('data-id', g._id);
	editGameModal.show();
};

const promptDeleteGame = (e) => {};

const sortGameRows = () => {
	games = games.sort(compareRounds(roundOrder));
	games.forEach((g) => {
		const r = gameBody.querySelector(`tr[data-id="${g._id}"]`);
		if (r) gameBody.appendChild(r);
	});
};

const createGameRow = (g) => {
	const row = createElement('tr.game-row');
	row.setAttribute('data-id', g._id);
	row.setAttribute('data-round', g.round);

	const rd = createElement('td');
	rd.innerHTML = g.round;

	const opp = createElement('td');
	opp.innerHTML = g.opponent;

	const cap = createElement('td');
	cap.innerHTML = g.cap === g.hardCap ? g.cap : `${g.cap}/${g.hardCap}`;

	const res = createElement('td');
	//game state
	//not started - period = 0
	if (g.period === 0) {
		res.innerHTML = `N/A (<a href="/games/${g._id}">Start</a>)`;
	}
	//in progress (period > 0)
	else if (period > 0 && !g.result) {
		res.innerHTML = `<a href="/games/${g._id}">${g.score}-${
			g.oppScore
		} (${toOrdinal(g.period)})</a>`;
	}
	//completed
	else {
		res.innerHTML = `<a href="/games/${g._id}">${g.result} ${g.score}-${g.oppScore}</a>`;
	}

	const editInfo = createElement('td');
	const editButton = createElement('button');
	editButton.innerHTML = '✏️';
	editButton.setAttribute('data-id', g._id);
	editButton.addEventListener('click', loadGameInfo);
	editInfo.appendChild(editButton);

	const deleteGame = createElement('td');
	const delButton = createElement('button');
	delButton.innerHTML = '❌';
	delButton.setAttribute('data-id', g._id);
	delButton.addEventListener('click', promptDeleteGame);
	deleteGame.appendChild(delButton);

	row.appendChild(rd);
	row.appendChild(opp);
	row.appendChild(cap);
	row.appendChild(res);
	row.appendChild(editInfo);
	row.appendChild(deleteGame);

	return row;
};

const createGameTable = (order) => {
	games = games.sort(compareRounds(order));
	roundOrder = order;

	const rows = getElementArray(gameBody, 'tr:not(.filler-row)');
	rows.forEach((r) => {
		r.remove();
	});

	games.forEach((g) => {
		const row = createGameRow(g);
		gameBody.appendChild(row);
	});
	// sortGameRows();
};

const handleCap = () => {
	//if win by 1, then hard cap is just the same as the normal point cap
	if (parseInt(winBy.value) === 1) {
		gameHardCap.disabled = true;
		gameHardCap.value = gameCap.value;
	} else {
		//if win by 2, the hard cap should be at least the cap + 1.
		gameHardCap.disabled = false;
		gameHardCap.setAttribute('min', parseInt(gameCap.value) + 1);
		gameHardCap.value = Math.max(
			parseInt(gameHardCap.value),
			parseInt(gameCap.value) + 1
		);
	}
};

const populateRoundInfo = (info) => {
	getElementArray(roundSelect, 'option').forEach((o) => {
		o.remove();
	});
	getElementArray(editRoundSelect, 'option').forEach((o) => {
		o.remove();
	});

	//round names
	if (info.format.roundNames) {
		info.format.roundNames.forEach((n) => {
			const op = createElement('option');
			op.setAttribute('value', n);
			op.innerHTML = n;
			roundSelect.appendChild(op);
			const op2 = op.cloneNode(true);
			editRoundSelect.appendChild(op2);
		});
	}
	//round info
	populateForm(addGameForm, info);
};

const handleCreateGame = (e) => {
	if (e.target !== addGameForm) return;
	e.preventDefault();

	if (!event) return showMessage('error', 'No event selected');

	const str = `/api/v1/games`;
	const body = {
		round: roundSelect.value,
		opponent: oppName.value,
		tournament: event._id,
		format: event.format._id,
		cap: parseInt(gameCap.value),
		hardCap: parseInt(gameHardCap.value),
		winBy: parseInt(winBy.value),
		timeouts: parseInt(gameTimeouts.value),
	};
	const handler = (res) => {
		if (res.status === 'success') {
			showMessage('info', 'Successfully added game.');
			const row = createGameRow(res.data);
			games.push(res.data);
			gameBody.appendChild(row);
			sortGameRows();
			oppName.value = '';
			oppName.focus();
		} else {
			showMessage('error', res.message);
		}
	};
	handleRequest(str, 'POST', body, handler);
};

const handleSaveGame = (e) => {
	if (e.target !== editGameForm) return;
	e.preventDefault();

	if (!editGameForm.getAttribute('data-id')) return;

	const str = `/api/v1/games/${editGameForm.getAttribute('data-id')}`;
	let body = {
		round: editRoundSelect.value,
		opponent: editOpponent.value,
		cap: parseInt(editCap.value),
		winBy: parseInt(editWinBy.value),
		hardCap: parseInt(editHardCap.value),
	};
	const handler = (res) => {
		if (res.status === 'success') {
			showMessage('info', 'Successfully edited game.');
			const row = gameBody.querySelector(
				`.game-row[data-id="${res.data._id}"]`
			);
			if (row) row.remove();
			const newRow = createGameRow(res.data);
			gameBody.appendChild(newRow);
			sortGameRows();
			editGameModal.hide();
			games = games.map((g) => {
				if (g._id === res.data._id) {
					return {
						...g,
						...res.data,
					};
				}
				return g;
			});
		} else {
			showMessage('error', res.message);
		}
	};
	handleRequest(str, 'PATCH', body, handler);
};

document.addEventListener('DOMContentLoaded', () => {
	document.addEventListener('load-tourney', (e) => {
		event = e.detail;
		games = e.detail.games;
		console.log(games);
		createGameTable(e.detail.format.roundNames);
		populateRoundInfo(e.detail);
	});
	gameCap.addEventListener('change', handleCap);
	winBy.addEventListener('change', handleCap);
	addGameForm.addEventListener('submit', handleCreateGame);

	editGameForm.addEventListener('submit', handleSaveGame);
});
