import { getElementArray } from '../utils/getElementArray.js';
import { createElement } from '../utils/createElementFromSelector.js';
import { handleRequest } from '../utils/requestHandler.js';
import { randomUUID } from '../utils/randomUUID.js';

const area = document.querySelector('#field-usage');
const field = document.querySelector('#field-usage-field');
let size = {
	width: null,
	height: null,
};

let allData;
let x, y, g;
const results = ['complete', 'drop', 'throwaway', 'stall'];
const colors = ['#17becf', '#ffff00', '#e377c2', '#7f7f7f'];
const color = d3.scaleOrdinal(colors);
const playerSelect = area.querySelector('#field-usage-player-select');

field.addEventListener(
	'init',
	(e) => {
		const len = e.detail.endzone * 2 + e.detail.length;
		const wid = e.detail.width;
		const ratio = ((100 * wid) / len).toFixed(2);
		e.target.style = `--bs-aspect-ratio: ${ratio}%;`;
		const dims = e.target.getBoundingClientRect();
		size.width = dims.width;
		size.height = dims.height;
		x = d3
			.scaleLinear()
			.domain([0, e.detail.endzone * 2 + e.detail.length])
			.range([0, size.width]);
		y = d3.scaleLinear().domain([0, e.detail.width]).range([0, size.height]);
		const svg = d3
			.select('#field-usage-field')
			.append('svg')
			.attr('height', '100%')
			.attr('width', '100%');
		const fieldLines = svg.append('g');
		g = svg.append('g');
		//endzone lines
		fieldLines
			.append('line')
			.attr('x1', x(e.detail.endzone))
			.attr('x2', x(e.detail.endzone))
			.attr('y1', 0)
			.attr('y2', y(e.detail.width))
			.attr('stroke', 'white')
			.attr('width', 2);
		fieldLines
			.append('line')
			.attr('x1', x(e.detail.endzone + e.detail.length))
			.attr('x2', x(e.detail.endzone + e.detail.length))
			.attr('y1', 0)
			.attr('y2', y(e.detail.width))
			.attr('stroke', 'white')
			.attr('width', 2);
		//midfield
		fieldLines
			.append('line')
			.attr('x1', x(e.detail.endzone + e.detail.length / 2))
			.attr('x2', x(e.detail.endzone + e.detail.length / 2))
			.attr('y1', 0)
			.attr('y2', y(e.detail.width))
			.attr('stroke', 'white')
			.attr('stroke-dasharray', '7,7')
			.attr('width', 2);
		//brick marks
		fieldLines
			.append('line')
			.attr('x1', x(e.detail.endzone + e.detail.brick - 1))
			.attr('x2', x(e.detail.endzone + e.detail.brick + 1))
			.attr('y1', y(e.detail.width / 2 - 1))
			.attr('y2', y(e.detail.width / 2 + 1))
			.attr('stroke', 'white')
			.attr('width', 2);
		fieldLines
			.append('line')
			.attr('x1', x(e.detail.endzone + e.detail.brick - 1))
			.attr('x2', x(e.detail.endzone + e.detail.brick + 1))
			.attr('y1', y(e.detail.width / 2 + 1))
			.attr('y2', y(e.detail.width / 2 - 1))
			.attr('stroke', 'white')
			.attr('width', 2);
		fieldLines
			.append('line')
			.attr('x1', x(e.detail.endzone + e.detail.length - e.detail.brick - 1))
			.attr('x2', x(e.detail.endzone + e.detail.length - e.detail.brick + 1))
			.attr('y1', y(e.detail.width / 2 - 1))
			.attr('y2', y(e.detail.width / 2 + 1))
			.attr('stroke', 'white')
			.attr('width', 2);
		fieldLines
			.append('line')
			.attr('x1', x(e.detail.endzone + e.detail.length - e.detail.brick - 1))
			.attr('x2', x(e.detail.endzone + e.detail.length - e.detail.brick + 1))
			.attr('y1', y(e.detail.width / 2 + 1))
			.attr('y2', y(e.detail.width / 2 - 1))
			.attr('stroke', 'white')
			.attr('width', 2);

		results.forEach((r) => {
			const legend = d3
				.select('#field-usage .legend-container')
				.append('svg')
				.attr('height', 50);
			const legendItem = legend.append('g').attr('transform', `translate(0,5)`);
			legendItem
				.append('circle')
				.attr('cx', 7)
				.attr('cy', 7)
				.attr('r', 5)
				.attr('stroke', 'black')
				.attr('fill', color(r));
			legendItem
				.append('text')
				.attr('x', 15)
				.attr('y', 10)
				.attr('text-anchor', 'start')
				.style('text-transform', 'capitalize')
				.text(r);
		});
	},
	{ once: true }
);

field.addEventListener('data-update', (e) => {
	//remove any players that should be gone
	getElementArray(playerSelect, 'option:not([value=""])').forEach((op) => {
		if (
			e.detail.tournaments.some((t) => {
				const id = op.getAttribute('data-id');
				if (t.games.length === 0) return false;
				return t.roster.some((p) => {
					return p.id === id;
				});
			})
		)
			return;
		op.remove();
	});

	//add the player options that should be added
	let options = [];
	e.detail.tournaments.forEach((t) => {
		if (t.games.length > 0)
			t.roster.forEach((p) => {
				if (
					!options.some((pl) => {
						return pl.id === p.id;
					})
				)
					options.push({ ...p });
			});
	});
	options.sort((a, b) => {
		return a.name.localeCompare(b.name);
	});
	options.forEach((o) => {
		const op = playerSelect.querySelector(`option[value="${o.id}"]`);
		if (op) playerSelect.appendChild(op);
		else {
			const newOp = createElement('option');
			newOp.setAttribute('value', o.id);
			newOp.innerHTML = o.name;
			playerSelect.appendChild(newOp);
		}
	});

	const pre1 = e.detail.passes.filter((p) => {
		return p.thrower || p.receiver;
	});

	allData = pre1.map((p) => {
		return {
			id: randomUUID(),
			result: p.result,
			thrower: p.thrower,
			receiver: p.receiver,
			x: ['complete', 'drop'].includes(p.result) ? p.x1 : p.x0,
			y: ['complete', 'drop'].includes(p.result) ? p.y1 : p.y0,
		};
	});

	update(allData);
});

const filterData = () => {
	const pid = playerSelect.value;
	if (pid === '') return update(allData);

	const filteredData = allData.filter((p, i) => {
		return p.thrower === pid || p.receiver === pid;
	});
	update(filteredData);
};
playerSelect.addEventListener('change', filterData);

const update = (data) => {
	const a = data.length;
	if (!data) return;
	const filter = getElementArray(area, 'input[type="checkbox"]:checked').map(
		(b) => b.getAttribute('value')
	);

	const filteredData = data.filter((d) => {
		return filter.includes(d.result);
	});

	const circles = g.selectAll('circle').data(filteredData, (d) => d.id);
	circles.exit().remove();

	circles
		.enter()
		.append('circle')
		.attr('fill', (d) => color(d.result))
		.merge(circles)
		.attr('cy', (d) => y(d.y))
		.attr('cx', (d) => x(d.x))
		.attr('r', 3);
};

getElementArray(area, 'input[type="checkbox"]').forEach((b) => {
	b.addEventListener('change', filterData);
});
