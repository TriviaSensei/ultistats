import { createElement } from './createElementFromSelector.js';
import { getElementArray } from './getElementArray.js';

export const createRosterOption = (p, changeFunc) => {
	const name = `${p.lastName}, ${p.firstName}`;
	const op = createElement('.roster-option');
	op.setAttribute('data-id', p.id);
	op.setAttribute('data-name', name);
	if (p.gender) op.setAttribute('data-gender', p.gender);
	if (p.line) op.setAttribute('data-line', p.line);
	if (p.position && p.position !== '-')
		op.setAttribute('data-position', p.position);
	const cb = createElement('input');
	const newId = window.crypto.randomUUID();
	cb.setAttribute('id', newId);
	cb.setAttribute('data-id', `${p.id}`);
	cb.setAttribute('type', 'checkbox');
	cb.addEventListener('change', changeFunc);
	const lbl = createElement('label');
	lbl.setAttribute('for', cb.id);
	lbl.innerHTML = `${name} (${p.gender ? p.gender + '/' : ''}${
		p.line ? p.line + '/' : ''
	}${p.position || '-'}${
		p.pointsPlayed >= 0
			? ',&nbsp;<span class="points-played">' +
			  p.pointsPlayed +
			  '</span>&nbsp;PP'
			: ''
	})`;
	const lbl2 = createElement('label.points-off.invisible');
	op.appendChild(cb);
	const cont = createElement('.d-flex.flex-row-reverse');
	cont.appendChild(lbl2);
	cont.appendChild(lbl);
	op.appendChild(cont);
	return op;
};

export const insertOption = (op, container) => {
	//figure out where to insert the option (they're sorted alphabetically)
	const otherOptions = getElementArray(container, '.roster-option');
	if (
		!otherOptions.some((o) => {
			const otherName = o.getAttribute('data-name');
			if (op.getAttribute('data-name').localeCompare(otherName) <= 0) {
				container.insertBefore(op, o);
				const box = op.querySelector('input[type="checkbox"]');
				if (box) box.checked = false;
				return true;
			}
		})
	) {
		container.appendChild(op);
		const box = op.querySelector('input[type="checkbox"]');
		if (box) box.checked = false;
	}

	//uncheck any other box still checked
	getElementArray(
		document,
		'.roster-option input[type="checkbox"]:checked'
	).forEach((b) => {
		b.checked = false;
	});
};
