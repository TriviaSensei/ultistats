import { StateHandler } from '../utils/stateHandler.js';
import { createElement } from '../utils/createElementFromSelector.js';
import { getElementArray } from '../utils/getElementArray.js';

const container = document.querySelector('.container-all');

const pb = document.querySelector('.progress-bar');
let bar = document.querySelector('#pb-inner');
const count = document.querySelector('#count');
const total = document.querySelector('#total');
const limit = document.querySelector('#limit');
const num = document.querySelector('#my-number');
const butt = document.querySelector('#add-it');
const reset = document.querySelector('#reset-it');

const sh = new StateHandler({
	limit: 500,
	value: 0,
	count: 0,
});

const addIt = (e) => {
	const val = parseInt(num.value);
	if (val >= 0) {
		sh.setState((prev) => {
			return {
				...prev,
				value: prev.value + val,
				count: prev.count + 1,
			};
		});
	}
	num.value = null;
};

const updateCount = (e) => {
	e.target.innerHTML = e.detail.count;
};
const updateTotal = (e) => {
	e.target.innerHTML = e.detail.value;
};
const setBar = (e) => {
	const b = e.target;
	console.log(sh.getState());
	const pct = Math.min(100, (100 * e.detail.value) / sh.getState().limit);
	b.style.width = `${pct}%`;
	b.removeAttribute('class');
	const p = Math.floor(pct / 25) * 25;
	b.classList.add(`h-100`, `pct-${p}`);
};
const resetCount = (e) => {
	bar.remove();
	bar = createElement('#pb-inner.h-100');
	pb.appendChild(bar);
	sh.addWatcher(bar, setBar);
	sh.setState((p) => {
		return {
			...p,
			count: 0,
			value: 0,
		};
	});
};

document.addEventListener('DOMContentLoaded', () => {
	limit.innerHTML = sh.getState().limit;
	sh.addWatcher(count, updateCount);
	sh.addWatcher(total, updateTotal);
	sh.addWatcher(bar, setBar);
	butt.addEventListener('click', addIt);
	reset.addEventListener('click', resetCount);

	const testElement = createElement(
		'#my-test.d-flex.mx-3.my-2.progress-bar.w-50[data-id="asdf"][data-value="14"]'
		// {
		// 	'data-id': 'asdf',
		// 	'data-value': 14,
		// 	'data-inv': {
		// 		value: 15,
		// 		name: 'chuck',
		// 	},
		// }
	);
	container.appendChild(testElement);
});
