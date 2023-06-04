import { handleRequest } from './utils/requestHandler.js';
import { showMessage } from './utils/messages.js';
import { getElementArray } from './utils/getElementArray.js';
import { createElement } from './utils/createElementFromSelector.js';

const teamSelect = document.querySelector('#stats-team-select');
const tourneySelect = document.querySelector('#tournament-stat-select');
const startDate = document.querySelector('#stat-start-date');
const endDate = document.querySelector('#stat-end-date');

const getTournaments = (e) => {
	tourneySelect.innerHTML = '<option value="">All</option>';
	if (!teamSelect.value) return;

	const str = `/api/v1/teams/tournament-details/${teamSelect.value}`;
	const handler = (res) => {
		$('#date-slider').slider('option', 'disabled', true);

		if (res.status === 'success') {
			if (res.data.length === 0)
				return showMessage('warning', 'No events listed for this team.', 2000);
			if (
				res.data.every((t) => {
					return t.games.length === 0;
				})
			)
				return showMessage('warning', 'No games listed for this team.', 2000);
			res.data = res.data.sort((a, b) => {
				return Date.parse(b.startDate - a.startDate);
			});
			const minDate = Date.parse(res.data[0].startDate);
			const maxDate = Date.parse(res.data[res.data.length - 1].startDate);

			console.log(minDate, maxDate);

			$('#date-slider').slider('option', 'min', minDate);
			$('#date-slider').slider('option', 'max', maxDate);
			$('#date-slider').slider('option', 'values', [minDate, maxDate]);
			$('#date-slider').slider('option', 'disabled', false);

			startDate.innerHTML = new Date(minDate).toLocaleDateString();
			endDate.innerHTML = new Date(maxDate).toLocaleDateString();

			console.log(startDate);

			res.data.forEach((t) => {});
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
			max: 1,
			values: [0, 1],
			disabled: true,
			slide: (e, ui) => {
				startDate.innerHTML = new Date(ui.values[0]).toLocaleDateString();
				endDate.innerHTML = new Date(ui.values[1]).toLocaleDateString();
			},
		});
	});
});
