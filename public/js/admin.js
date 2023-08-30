import { handleRequest } from './utils/requestHandler.js';
import { createElement } from './utils/createElementFromSelector.js';

const searchButton = document.querySelector('#search-users');
const browseAll = document.querySelector('#browse-all-users');

const name = document.querySelector('#user-name');
const email = document.querySelector('#user-email');
const hasTeam = document.querySelector('#has-teams');
const hasSub = document.querySelector('#has-sub');

const results = document.querySelector('#search-results');

const createUserCard = (user) => {
	const card = createElement('.user-card.active');
	const name = createElement('.user-name.d-flex.align-items-start.mb-1');
	const email = createElement('div');
	const inactive = createElement('.inactive');
	const tableContainer = createElement('div');
	const teamTable = createElement('table.team-table');

	card.appendChild(name);
	card.appendChild(email);
	card.appendChild(inactive);
	card.appendChild(tableContainer);
	tableContainer.appendChild(teamTable);

	if (!user) {
		card.classList.add('placeholder-glow');
		name.innerHTML = `<span class="placeholder w-50">Placeholder name</span>`;
		email.classList.add('placeholder', 'w-75');
		email.innerHTML = 'Placeholder e-mail';
		const r1 = createElement('tr.w-100.placeholder-glow');
		const r2 = createElement('tr.w-100.placeholder-glow');
		teamTable.classList.add('w-75');
		teamTable.appendChild(r1);
		teamTable.appendChild(r2);
		r1.innerHTML = `<td class="w-100 placeholder"></td>`;
		r2.innerHTML = `<td class="w-100 placeholder"></td>`;
	} else {
		name.innerHTML = `${user.lastName}, ${user.firstName}`;
		email.innerHTML = `${user.email}`;
		if (!user.active) card.classList.remove('active');
		const headerRow = createElement('tr');
		const h1 = createElement('th');
		h1.innerHTML = 'Team';
		const h2 = createElement('th');
		h2.innerHTML = 'Sub';
		const h3 = createElement('th');
		h3.innerHTML = 'Exp/Renew';
		headerRow.appendChild(h1);
		headerRow.appendChild(h2);
		headerRow.appendChild(h3);
		teamTable.appendChild(headerRow);
		console.log(user);
		if (user.teams.length === 0) {
			const row = createElement('tr');
			const cell = createElement('td');
			cell.setAttribute('colspan', 3);
			row.appendChild(cell);
			cell.innerHTML = 'No teams';
			teamTable.appendChild(row);
		} else {
			user.teams.forEach((t) => {
				const row = createElement('tr');
				const c1 = createElement('td');
				const c2 = createElement('td');
				const c3 = createElement('td');
				[c1, c2, c3].forEach((c) => {
					row.appendChild(c);
				});
				c1.innerHTML = t.name;
				c2.innerHTML = '<div></div>';

				if (t.subscription && Date.parse(t.subscription.expires) > Date.now()) {
					const newDate = new Date(Date.parse(t.subscription.expires));
					newDate.setFullYear(new Date().getFullYear());
					if (newDate < Date.now())
						newDate.setFullYear(new Date().getFullYear() + 1);
					c3.innerHTML = newDate.toLocaleDateString();
					c2.classList.add('subscription');
				} else {
					c3.innerHTML = 'Never';
				}
				teamTable.appendChild(row);
			});
		}
	}
	results.appendChild(card);
};

const handleSearch = (e) => {
	const str = `/api/v1/users/search`;
	results.innerHTML = '';
	createUserCard(null);
	createUserCard(null);

	const handler = (res) => {
		setTimeout(() => {
			results.innerHTML = '';
			res.data.forEach((u) => {
				createUserCard(u);
			});
		}, 500);
	};
	handleRequest(
		str,
		'POST',
		e.target === searchButton
			? {
					name: name.value,
					email: email.value,
					hasTeam: hasTeam.checked,
					hasSub: hasSub.checked,
			  }
			: null,
		handler
	);
};

document.addEventListener('DOMContentLoaded', () => {
	searchButton.addEventListener('click', handleSearch);
	browseAll.addEventListener('click', handleSearch);
});
