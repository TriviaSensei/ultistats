import { getElementArray } from '../utils/getElementArray.js';

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
				.select('#field-usage > .legend-container')
				.append('svg');
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
	allData = e.detail
		.filter((p) => {
			return p.thrower || p.receiver;
		})
		.map((p) => {
			return {
				id: window.crypto.randomUUID(),
				result: p.result,
				x: ['complete', 'drop'].includes(p.result) ? p.x1 : p.x0,
				y: ['complete', 'drop'].includes(p.result) ? p.y1 : p.y0,
			};
		});

	update(allData);
});

const update = (data) => {
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
	b.addEventListener('change', () => {
		update(allData);
	});
});
