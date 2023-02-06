import { handleRequest } from './utils/requestHandler.js';
import { showMessage } from './utils/messages.js';
import { getElementArray } from './utils/getElementArray.js';

//team information
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
const firstName = document.querySelector('#first-name');
const lastName = document.querySelector('#last-name');
const displayName = document.querySelector('#display-name');
const number = document.querySelector('#number');
const position = document.querySelector('#position');
const pre1 = document.querySelector('#preview-1');
const pre2 = document.querySelector('#preview-2');

const handleColorChange = (e) => {
	if (![color1, color2, color3, color4].includes(e.target)) return;

	pre1.style.color = color2.value;
	pre1.style.backgroundColor = color1.value;
	pre2.style.color = color4.value;
	pre2.style.backgroundColor = color3.value;
};

const getTeam = (e) => {
	if (e.target !== teamSelect) return;
	if (!teamSelect.value) return;

	const str = `/api/v1/teams/${teamSelect.value}`;
	const handler = (res) => {
		if (res.status === 'success') {
			console.log(res);
			color1.value = res.data.color1;
			color2.value = res.data.color2;
			color3.value = res.data.color3;
			color4.value = res.data.color4;
			handleColorChange({ target: color1 });

			teamName.value = res.data.name;
			teamSeason.value = res.data.season;

			getElementArray(division, 'option').some((op, i) => {
				if (op.value.toLowerCase() === res.data.division.toLowerCase()) {
					division.selectedIndex = i;
					return true;
				}
			});
		} else {
			showMessage('error', res.message);
		}
	};
	handleRequest(str, 'GET', null, handler);
};

document.addEventListener('DOMContentLoaded', (e) => {
	teamSelect.addEventListener('change', getTeam);

	color1.addEventListener('change', handleColorChange);
	color2.addEventListener('change', handleColorChange);
	color3.addEventListener('change', handleColorChange);
	color4.addEventListener('change', handleColorChange);
});
