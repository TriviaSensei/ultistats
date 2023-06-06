import { handleRequest } from './utils/requestHandler.js';
import { showMessage } from './utils/messages.js';
import { getElementArray } from './utils/getElementArray.js';
import { createElement } from './utils/createElementFromSelector.js';
const msInDay = 24 * 60 * 60 * 1000;
const offset = new Date().getTimezoneOffset() * 60000;

const teamSelect = document.querySelector('#stats-team-select');
const tourneySelect = document.querySelector('#tournament-stat-select');
const startDate = document.querySelector('#stat-start-date');
const endDate = document.querySelector('#stat-end-date');
const gameSelect = document.querySelector('#game-select');
const gameSelectHeader = gameSelect?.querySelector('div');
const gameDropdown = document.querySelector('#game-dropdown');
const gameDropDownCollapse = new bootstrap.Collapse('#game-dropdown');
const filterCollapse = new bootstrap.Collapse('#filter-accordion');
const collapseFilters = document.querySelector('#hide-filters');

let allData;
let filteredData;

const updateData = (data) => {
	const val = tourneySelect.options[tourneySelect.selectedIndex].value;
	//remove any tournaments that got filtered out
	console.log(data);
	const ops = getElementArray(tourneySelect, 'option');
	console.log(ops);
	ops.forEach((o) => {
		if (
			!data.some((t) => {
				return t._id === o.value;
			}) &&
			o.value !== ''
		) {
			console.log(`removing ${o.innerHTML} (${o.value})`);
			//remove the tourney option
			o.remove();
			//remove the section and any games from the game selector
			const sect = gameDropdown.querySelector(`section[data-id="${o.value}"]`);
			if (sect) sect.remove();
		}
	});
	//add any tournaments that got added in
	data.forEach((t) => {
		//if the option is already there, don't do anything else.
		const tourney = tourneySelect.querySelector(`option[value="${t._id}"]`);
		if (tourney) return tourneySelect.appendChild(tourney);
		//otherwise create the option
		const op = createElement('option');
		const tourneyText = `${t.name} (${new Date(
			Date.parse(t.startDate) + offset
		).toLocaleDateString()}-${new Date(
			Date.parse(t.endDate) + offset
		).toLocaleDateString()})`;
		op.innerHTML = tourneyText;
		op.setAttribute('value', t._id);
		tourneySelect.appendChild(op);

		//handle the game dropdown
		if (t.games.length > 0) {
			const existingSection = gameDropdown.querySelector(
				`section[data-id="${t._id}"]`
			);

			if (existingSection) gameDropdown.appendChild(existingSection);
			else {
				const sect = createElement('section');
				if (!gameDropdown.querySelector(`section[data-id="${t._id}"]`)) {
					sect.setAttribute('data-id', t._id);
					const tourneyHeader = createElement('.tournament-header');
					tourneyHeader.setAttribute('data-id', t._id);
					tourneyHeader.innerHTML = tourneyText;
					sect.appendChild(tourneyHeader);
				}
				t.games.forEach((g) => {
					const gameOption = createGameOption(g, t._id);
					sect.appendChild(gameOption);
				});
				gameDropdown.appendChild(sect);
			}
		}
	});
	tourneySelect.removeAttribute('disabled');
	gameSelect.removeAttribute('disabled');
	getElementArray(tourneySelect, 'option').some((o, i) => {
		if (o.value === val) {
			tourneySelect.selectedIndex = i;
			return true;
		}
	});
};

const createGameOption = (game, id) => {
	const op = createElement('.game-option');
	const box = createElement('input');
	box.setAttribute('type', 'checkbox');
	box.setAttribute('value', game._id);
	box.setAttribute('id', `game-${game._id}`);
	box.setAttribute('data-id', game._id);
	const label = createElement('label');
	label.innerHTML = `${game.round} vs ${game.opponent} ${
		game.result
			? '(' + game.result + ' ' + game.score + '-' + game.oppScore + ')'
			: ''
	}`;
	label.setAttribute('for', `game-${game._id}`);
	op.appendChild(box);
	op.appendChild(label);
	op.setAttribute('data-tourney', id);
	return op;
};

const getTournaments = (e) => {
	tourneySelect.innerHTML = '<option value="">All</option>';
	if (!teamSelect.value) return;

	const str = `/api/v1/teams/tournament-details/${teamSelect.value}`;
	const handler = (res) => {
		$('#date-slider').slider('option', 'disabled', true);
		tourneySelect.setAttribute('disabled', true);
		startDate.innerHTML = '';
		endDate.innerHTML = '';
		gameSelectHeader.innerHTML = 'Select games';
		gameDropdown.innerHTML = '';
		gameDropDownCollapse.hide();
		if (res.status === 'success') {
			if (res.data.length === 0)
				return showMessage('warning', 'No events listed for this team.', 2000);
			if (
				res.data.every((t) => {
					return t.games.length === 0;
				})
			)
				return showMessage('warning', 'No games listed for this team.', 2000);
			allData = res.data;
			filteredData = res.data;
			res.data = res.data.sort((a, b) => {
				return Date.parse(b.startDate - a.startDate);
			});

			let minDate = Date.parse(res.data[0].startDate) + offset;
			let maxDate =
				Date.parse(res.data[res.data.length - 1].startDate) + offset;

			$('#date-slider').slider('option', 'min', minDate - msInDay);
			$('#date-slider').slider('option', 'max', maxDate + msInDay);
			$('#date-slider').slider('option', 'values', [
				minDate - msInDay,
				maxDate + msInDay,
			]);
			$('#date-slider').slider('option', 'disabled', false);

			startDate.innerHTML = new Date(minDate - msInDay).toLocaleDateString();
			endDate.innerHTML = new Date(maxDate + msInDay).toLocaleDateString();
			// startDate.innerHTML = new Date(minDate);
			// endDate.innerHTML = new Date(maxDate);

			updateData(filteredData);
		} else {
			showMessage('error', res.message);
		}
	};
	handleRequest(str, 'GET', { populate: true }, handler);
};

document.addEventListener('DOMContentLoaded', () => {
	teamSelect.addEventListener('change', getTournaments);
	$(function () {
		$('#date-slider').slider({
			range: true,
			min: 0,
			max: msInDay,
			values: [0, msInDay],
			step: msInDay,
			disabled: true,
			slide: (e, ui) => {
				startDate.innerHTML = new Date(
					ui.values[0] + offset
				).toLocaleDateString();
				endDate.innerHTML = new Date(
					ui.values[1] + offset
				).toLocaleDateString();

				filteredData = allData.filter((t) => {
					const a = ui.values[0] <= Date.parse(t.startDate) + offset;
					const b = ui.values[1] >= Date.parse(t.startDate) + offset;
					return a && b;
				});

				updateData(filteredData);
			},
		});
	});

	document.addEventListener('click', (e) => {
		if (!e.target.closest('#game-dropdown')) {
			gameDropDownCollapse.hide();
		}
	});
});
