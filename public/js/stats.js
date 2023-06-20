import { handleRequest } from './utils/requestHandler.js';
import { showMessage } from './utils/messages.js';
import { getElementArray } from './utils/getElementArray.js';
import { createElement } from './utils/createElementFromSelector.js';
import { StateHandler } from './utils/stateHandler.js';
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

const reportArea = document.querySelector('#report-area');

let data = {
	all: null,
	date: null,
	tournament: null,
	reportData: null,
	subscription: null,
};

const sh = new StateHandler(null);

const updateDataByDate = () => {
	//retain the old selected tourney
	const selectedTourney = tourneySelect.value;

	//remove any options that get filtered out by date
	const ops = getElementArray(tourneySelect, 'option');
	ops.forEach((o) => {
		if (
			!data.date.some((t) => {
				return t._id === o.value;
			}) &&
			o.value !== ''
		)
			o.remove();
	});

	//add any tournaments that got added in
	data.date.forEach((t) => {
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
	});

	//if the old tournament got removed from the list, or if we had selected "all", we will have to refresh the report data.
	if (
		!getElementArray(tourneySelect, 'option').some((o, i) => {
			if (o.value === selectedTourney) {
				tourneySelect.selectedIndex = i;
				return true;
			}
		}) ||
		tourneySelect.value === ''
	)
		handleSelectTourney();
};

const toggleAllGames = (e) => {
	const sect = e.target.closest('section.tourney-section');
	if (!sect) return;
	const checkedBoxes = getElementArray(sect, 'input[type="checkbox"]:checked');
	const uncheckedBoxes = getElementArray(
		sect,
		'input[type="checkbox"]:not(:checked)'
	);

	if (uncheckedBoxes.length === 0) {
		checkedBoxes.forEach((b) => {
			b.checked = false;
		});
	} else {
		uncheckedBoxes.forEach((b) => {
			b.checked = true;
		});
	}
	handleSelectGames();
};

const createGameOption = (game, id) => {
	const op = createElement('.game-option');
	const box = createElement('input');
	box.setAttribute('type', 'checkbox');
	box.setAttribute('value', game._id);
	box.setAttribute('id', `game-${game._id}`);
	box.setAttribute('data-id', game._id);
	box.setAttribute('checked', true);
	box.addEventListener('change', handleSelectGames);
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

const handleSliderValues = (data) => {
	$('#date-slider').slider('option', 'disabled', true);
	$('#date-slider').slider('option', 'min', 0);
	$('#date-slider').slider('option', 'max', 1);
	$('#date-slider').slider('option', 'values', [0, 1]);
	startDate.innerHTML = '';
	endDate.innerHTML = '';

	if (data.length === 0) return;

	let minDate = Date.parse(data[0].startDate) + offset;
	let maxDate = Date.parse(data[data.length - 1].startDate) + offset;

	$('#date-slider').slider('option', 'min', minDate - msInDay);
	$('#date-slider').slider('option', 'max', maxDate + msInDay);
	$('#date-slider').slider('option', 'values', [
		minDate - msInDay,
		maxDate + msInDay,
	]);
	$('#date-slider').slider('option', 'disabled', false);

	startDate.innerHTML = new Date(minDate - msInDay).toLocaleDateString();
	endDate.innerHTML = new Date(maxDate + msInDay).toLocaleDateString();
};

const getTournaments = (e) => {
	tourneySelect.innerHTML = '<option value="">All</option>';
	gameDropdown.innerHTML = '';
	gameSelectHeader.innerHTML = 'Select games';
	gameSelect.setAttribute('disabled', true);
	$('#date-slider').slider('option', 'disabled', true);
	tourneySelect.setAttribute('disabled', true);
	gameDropdown.innerHTML = '';
	gameDropDownCollapse.hide();
	reportArea.classList.add('invisible');

	if (!teamSelect.value) return;
	const str = `/api/v1/teams/tournament-details/${teamSelect.value}`;
	const handler = (res) => {
		if (res.status === 'success') {
			if (res.data.length === 0)
				return showMessage('warning', 'No events listed for this team.', 2000);
			if (
				res.data.every((t) => {
					return t.games.length === 0;
				})
			)
				return showMessage('warning', 'No games listed for this team.', 2000);

			const allData = res.data.sort((a, b) => {
				return Date.parse(b.startDate - a.startDate);
			});
			data.all = JSON.parse(JSON.stringify(allData));
			data.date = JSON.parse(JSON.stringify(allData));
			data.tournament = JSON.parse(JSON.stringify(allData));
			data.reportData = JSON.parse(JSON.stringify(allData));
			data.subscription = res.subscription || null;
			if (data.subscription)
				document.body.classList.add(data.subscription.toLowerCase());
			if (allData.length > 0) {
				const evt = new CustomEvent('init', {
					detail: allData[0].format,
				});
				const inits = ['field-usage-field', 'pass-chart'];
				inits.forEach((i) => {
					const obj = document.querySelector(`#${i}`);
					if (obj) obj.dispatchEvent(evt);
				});
			}
			handleSliderValues(allData);
			updateDataByDate();
			tourneySelect.removeAttribute('disabled');
			gameSelect.removeAttribute('disabled');
		} else {
			showMessage('error', res.message);
		}
	};
	handleRequest(str, 'GET', { populate: true }, handler);
};

//handle selecting a tourney (or all tourneys)
const handleSelectTourney = () => {
	let gamesChanged = false;
	//further filter the date-filtered data
	//if we selected a single tournament, we'll have a single-element array
	if (tourneySelect.value === '') data.tournament = data.date;
	else
		data.tournament = data.date.filter((t) => {
			return t._id === tourneySelect.value;
		});

	//for data.tournament, now handle the list of games
	//remove any sections for tournaments that aren't in data.tournament
	const sects = getElementArray(gameDropdown, 'section');
	sects.forEach((s) => {
		const id = s.getAttribute('data-id');
		if (
			!data.tournament.find((t) => {
				return t._id === id;
			})
		) {
			if (s.querySelector('input[type="checkbox"]:checked'))
				gamesChanged = true;
			s.remove();
		}
	});

	//add in any sections that aren't already there
	data.tournament.forEach((t) => {
		const existingSection = gameDropdown.querySelector(
			`section[data-id="${t._id}"]`
		);
		//if the section already exists, append it again (it will be moved to the bottom of the dropdown -
		//these are sorted chronologically so this keeps the order
		if (existingSection) gameDropdown.appendChild(existingSection);
		else {
			gamesChanged = true;
			const sect = createElement('section.tourney-section');
			if (!gameDropdown.querySelector(`section[data-id="${t._id}"]`)) {
				sect.setAttribute('data-id', t._id);
				const tourneyHeader = createElement('.tournament-header');
				tourneyHeader.setAttribute('data-id', t._id);
				const tourneyButton = createElement('button.tournament-button');
				tourneyButton.setAttribute('role', 'button');
				tourneyButton.addEventListener('click', toggleAllGames);
				const tourneyText = `${t.name} (${new Date(
					Date.parse(t.startDate) + offset
				).toLocaleDateString()}-${new Date(
					Date.parse(t.endDate) + offset
				).toLocaleDateString()})`;
				tourneyButton.innerHTML = tourneyText;
				tourneyHeader.appendChild(tourneyButton);
				sect.appendChild(tourneyHeader);
			}
			const tGames = t.games.filter((g) => {
				return g.result !== '';
			});
			if (tGames.length > 0)
				tGames.forEach((g) => {
					const gameOption = createGameOption(g, t._id);
					sect.appendChild(gameOption);
				});
			else {
				const ph = createElement('.ms-4.text-start');
				ph.innerHTML = '(No games listed)';
				sect.appendChild(ph);
			}
			gameDropdown.appendChild(sect);
		}
	});

	if (gamesChanged) handleSelectGames();
};

//handle toggling a game in or out of the data
const handleSelectGames = () => {
	let selectedGames = 0;
	data.reportData = data.tournament.map((t) => {
		const games = t.games.filter((g) => {
			return gameDropdown.querySelector(
				`.game-option[data-tourney="${t._id}"] > input[type="checkbox"][value="${g._id}"]:checked`
			);
		});
		selectedGames = selectedGames + games.length;
		return {
			...t,
			games,
		};
	});

	gameSelectHeader.innerHTML = `Select games (${selectedGames} selected)`;
	if (selectedGames === 0) reportArea.classList.add('invisible');
	else
		sh.setState({
			data: data.reportData,
			subscription: data.subscription,
		});
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
				//change the values in the labels above the slider
				startDate.innerHTML = new Date(
					ui.values[0] + offset
				).toLocaleDateString();
				endDate.innerHTML = new Date(
					ui.values[1] + offset
				).toLocaleDateString();

				//filter the tournaments by date
				data.date = data.all.filter((t) => {
					return (
						Date.parse(t.startDate) >= ui.values[0] &&
						Date.parse(t.endDate) <= ui.values[1]
					);
				});

				updateDataByDate();
			},
		});
	});

	document.addEventListener('click', (e) => {
		if (!e.target.closest('#game-dropdown')) {
			gameDropDownCollapse.hide();
		}
	});

	tourneySelect.addEventListener('change', handleSelectTourney);

	const reportSections = ['overview', 'eff', 'leaders'];
	sh.addWatcher(null, (state) => {
		if (!state) return;

		const evt = new CustomEvent('data-update', {
			detail: state,
		});
		reportArea.classList.remove('invisible');
		reportSections.forEach((s) => {
			const sect = reportArea.querySelector(`#${s}`);
			if (sect) sect.dispatchEvent(evt);
		});
	});
});
