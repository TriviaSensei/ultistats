import { getElementArray } from '../utils/getElementArray.js';
import { createElement } from '../utils/createElementFromSelector.js';

let allData;
const parent = document.querySelector('#pass-chart');
const playerSelect = parent.querySelector('#pass-chart-player-select');

const grid = d3
	.select('#pass-chart .graph-container')
	.append('svg')
	.attr('id', 'pass-chart-grid')
	.attr('width', '100%')
	.attr('class', 'f-1');

const colorScale1 = d3
	.scaleLinear()
	.domain([0, 0.5])
	.range(['#ff0000', '#ffff00']);

const colorScale2 = d3
	.scaleLinear()
	.domain([0.5, 1])
	.range(['#ffff00', '#00bf30']);

const colorScale = (x) => {
	if (x <= 0.5) return colorScale1(x);
	else if (x <= 1) return colorScale2(x);
	else return null;
};

const t = d3.transition().duration(200);
let gridChart;
let x, y;
let h, w;

const margin = {
	bottom: 130,
	top: 10,
	x: 80,
};
const gradientWidth = 3 / 5;
const gradientHeight = 15;

let sizeAxis,
	dims,
	chartRect,
	bottom,
	legendMargin,
	legendWidth,
	sizeLegendScale;

parent.addEventListener(
	'init',
	() => {
		const chartAll = parent.querySelector('#pass-chart-grid');
		dims = chartAll.getBoundingClientRect();

		h = dims.height - margin.bottom - margin.top;
		w = h * 1.2;

		if (w > dims.width - margin.x * 2) {
			w = dims.width - margin.x * 2;
			h = w / 1.2;
		}
		const maxBoxSize = w / 6;

		//actual grid area
		gridChart = grid
			.append('g')
			.attr('id', 'grid-chart')
			.attr('transform', `translate(${dims.width / 2 - w / 2}, ${margin.top})`);

		x = d3.scaleLinear().domain([-30, 30]).range([0, w]);
		y = d3.scaleLinear().domain([40, -10]).range([0, h]);

		const xAxisCall = d3
			.axisBottom(x)
			.tickValues([-25, -15, -5, 5, 15, 25])
			.tickFormat((d, i) => {
				return ['L21+', 'L15', 'L5', 'R5', 'R15', 'R20+'][i];
			});

		//x-axis
		const xAxis = gridChart
			.append('g')
			.attr('class', 'x axis')
			.attr('transform', `translate(0,${h})`)
			.call(xAxisCall);

		//x-label
		const xAxisLabel = gridChart
			.append('text')
			.text('Yards swung')
			.attr('x', w / 2)
			.attr('y', h + 30)
			.attr('text-anchor', 'middle');

		const yAxisCall = d3
			.axisLeft(y)
			.tickValues([-5, 5, 15, 25, 35])
			.tickFormat((d, i) => {
				return ['<0', '0-9', '10-19', '20-29', '30+'][i];
			});

		//y-axis
		const yAxis = gridChart.append('g').attr('class', 'y axis').call(yAxisCall);

		//y-label
		gridChart
			.append('text')
			.text('Yards gained')
			.attr('x', -h / 2)
			.attr('y', -50)
			.attr('transform', 'rotate(-90)')
			.attr('text-anchor', 'middle');

		chartRect = document.querySelector('#grid-chart');
		bottom = chartRect.getBoundingClientRect().height;

		legendMargin = {
			x: 30,
			y: 15,
		};
		legendWidth = gradientWidth * dims.width - legendMargin.x * 2;

		//gradient legend
		const maxGradientElements = 100;
		const legendRow = grid
			.append('g')
			.attr('id', 'legend-row')
			.attr('transform', `translate(0,${bottom + legendMargin.y})`);
		const gradientElements = Math.min(maxGradientElements, legendWidth);
		for (var i = 0; i < gradientElements; i++) {
			const pct = (2 * i + 1) / (2 * gradientElements);
			legendRow
				.append('rect')
				.attr('x', legendMargin.x + (i * legendWidth) / gradientElements)
				.attr('y', legendMargin.y)
				.attr('width', legendWidth / gradientElements)
				.attr('height', gradientHeight)
				.attr('fill', colorScale(pct))
				.attr('stroke', colorScale(pct));
		}

		//axis
		const gradientX = d3.scaleLinear().domain([0, 1]).range([0, legendWidth]);
		const gradientAxisCall = d3
			.axisBottom(gradientX)
			.tickValues([0, 0.25, 0.5, 0.75, 1])
			.tickFormat((d) => `${100 * d}%`);
		const gradientAxis = legendRow
			.append('g')
			.attr('class', 'x axis')
			.attr('id', 'gradient-axis')
			.attr(
				'transform',
				`translate(${legendMargin.x},${legendMargin.y + gradientHeight})`
			)
			.call(gradientAxisCall);
		legendRow
			.append('text')
			.text('Cmp%')
			.attr('x', legendMargin.x + legendWidth / 2)
			.attr('y', legendMargin.y + gradientHeight + 30)
			.attr('text-anchor', 'middle');

		legendRow
			.append('text')
			.text('Attempts')
			.attr('x', gradientWidth * dims.width + legendMargin.x + w / 12)
			.attr('y', legendMargin.y + gradientHeight + 30)
			.attr('text-anchor', 'middle');
	},
	{ once: true }
);

let grp;

const filterData = () => {
	const pid = playerSelect.value;
	let type = parent.querySelector(
		'input[type="radio"][name="pass-chart-show"]:checked'
	)?.value;

	if (!pid) return update(allData);
	else if (!type) type = 'thrower';

	const filteredData = allData.filter((p) => p[type] === pid);
	update(filteredData);
};

playerSelect.addEventListener('change', filterData);
getElementArray(parent, `input[type="radio"][name="pass-chart-show"]`).forEach(
	(el) => el.addEventListener('change', filterData)
);

parent.addEventListener('data-update', (e) => {
	allData = e.detail.passes.filter((p) => {
		return p.thrower;
	});

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

	update(allData);
});

const showTip = (e) => {
	const tip = document.querySelector('#tip');
	tip.innerHTML = e.target.getAttribute('data-info');
	const r = e.target.getBoundingClientRect();

	tip.classList.remove('d-none');
	const tipWidth = tip.getBoundingClientRect().width;
	tip.style = `left:${r.left - tipWidth / 2 + r.width / 2}px;top:${
		r.bottom + 10
	}px;`;
	tip.classList.add('s');
};

const hideTip = (e) => {
	tip.innerHTML = '';
	tip.classList.add('d-none');
	tip.classList.remove('s');
};

const getBucket = (p) => {
	const yds = p.x1 - p.x0;
	const s = p.y1 - p.y0;
	//yards gained buckets - <0 (-10), 0, 5, 10, 20, 30, >30
	const dy = Math.max(-10, Math.min(30, Math.floor(yds / 10) * 10));
	//yards swung buckets: <-20. -20 - -10. -10 - 0, 0 - 10, 10 - 20, >20
	const dx = s <= -20 ? -30 : s > 20 ? 20 : Math.floor(s / 10) * 10;
	return `${dx},${dy}`;
};

const update = (data) => {
	grp = d3.groups(data, getBucket).map((d) => {
		const a = d[0].split(',').map((n) => parseInt(n));
		return {
			group: d[0],
			x: a[0],
			y: a[1],
			cmp: d[1].reduce((p, c) => {
				if (c.result === 'complete') return p + 1;
				else return p;
			}, 0),
			att: d[1].length,
			passes: d[1],
		};
	});

	const extent = d3.extent(grp, (d) => d.att);

	const rects = gridChart.selectAll('rect.data-rect').data(grp, (d) => d.group);
	rects.exit().remove();
	rects
		.enter()
		.append('rect')
		.on('mouseover', showTip)
		.on('mouseout', hideTip)
		.merge(rects)
		.attr('class', 'data-rect')
		.attr('data-info', (d) => {
			const group = d.group.split(',').map((x) => parseInt(x));
			const gain =
				group[1] >= 30
					? '30+'
					: group[1] < 0
					? '<0'
					: `${group[1]}-${group[1] + 9}`;
			const swing =
				group[0] <= -30 || group[0] >= 20
					? '20+'
					: group[0] < 0
					? `${Math.abs(group[0]) - 9}-${Math.abs(group[0])}`
					: `${group[0]}-${group[0] + 9}`;
			let html = `<strong>Gain: </strong>${gain} yds`;
			html += `<br><strong>Swing: </strong>${swing} yds ${
				group[0] < 0 ? 'Left' : 'Right'
			}`;
			html += `<br><strong>Cmp/Att: </strong>${d.cmp}/${d.att} (${(
				(100 * d.cmp) /
				d.att
			).toFixed(1)}%)`;

			return html;
		})
		.transition()
		.duration(200)
		.attr('fill', (d) => colorScale(d.cmp / d.att))
		.attr('stroke', 'black')
		.attr('width', (d) => (Math.sqrt(d.att / extent[1]) * w) / 6)
		.attr('height', (d) => (Math.sqrt(d.att / extent[1]) * w) / 6)
		.attr('data-bucket', (d) => d.group)
		.attr('transform', (d) => {
			const factor = Math.sqrt(d.att / extent[1]);
			const dt = ((1 - factor) * w) / 12;
			return `translate(${x(d.x) + dt},${y(d.y + 10) + dt})`;
		});

	gridChart.select('circle').remove();
	gridChart
		.append('circle')
		.attr('stroke', 'black')
		.attr('fill', 'white')
		.attr('cx', x(0))
		.attr('cy', y(0))
		.attr('r', 5);

	//box size legend update
	let valuesToShow = [extent[1]];
	while (valuesToShow.slice(-1).pop() >= 2 && valuesToShow.length < 2) {
		valuesToShow.push(Math.floor(valuesToShow.slice(-1).pop() / 3));
	}
	valuesToShow = valuesToShow.map((v, i) => {
		return {
			value: v,
			sideRatio: Math.sqrt(v / valuesToShow[0]),
			index: i,
		};
	});

	const legendRow = grid.select('#legend-row');
	const legendBoxes = legendRow
		.selectAll('rect.legend-box')
		.data(valuesToShow, (d) => d.sideRatio);
	legendBoxes.exit().remove();
	legendBoxes
		.enter()
		.append('rect')
		.merge(legendBoxes)
		.attr('class', 'legend-box')
		.attr('fill', 'none')
		.attr('stroke', 'black')
		.attr('x', dims.width * gradientWidth + legendMargin.x)
		.attr(
			'y',
			(d) => legendMargin.y + gradientHeight - (w / 6) * d.sideRatio + 10
		)
		.attr('width', (d) => (w / 6) * d.sideRatio)
		.attr('height', (d) => (w / 6) * d.sideRatio);

	const legendLines = legendRow
		.selectAll('line.legend-line')
		.data(valuesToShow, (d) => d.sideRatio);
	legendLines.exit().remove();
	legendLines
		.enter()
		.append('line')
		.merge(legendLines)
		.attr('class', 'legend-line')
		.attr('stroke', 'black')
		.attr('stroke-dasharray', '2,2')
		.attr(
			'x1',
			(d) => dims.width * gradientWidth + (w / 6) * d.sideRatio + legendMargin.x
		)
		.attr(
			'y1',
			(d) => legendMargin.y + gradientHeight - (w / 6) * d.sideRatio + 10
		)
		.attr('x2', (d) => {
			//if 40 px would go off the slide, go as far as we can
			if (
				dims.width * gradientWidth + w / 6 + legendMargin.x + 40 >
				dims.width - legendMargin.x
			) {
				return dims.width - legendMargin.x - 20 - 20 * d.index;
			} else {
				return (
					dims.width * gradientWidth +
					w / 6 +
					legendMargin.x +
					40 -
					20 * d.index
				);
			}
		})
		.attr(
			'y2',
			(d) => legendMargin.y + gradientHeight - (w / 6) * d.sideRatio + 10
		);

	const legendLabels = legendRow
		.selectAll('text.legend-text')
		.data(valuesToShow, (d) => d.sideRatio);
	legendLabels.exit().remove();
	legendLabels
		.enter()
		.append('text')
		.merge(legendLabels)
		.text((d) => d.value)
		.attr('class', 'legend-text')
		.attr('x', (d) => {
			if (
				dims.width * gradientWidth + w / 6 + legendMargin.x + 40 >
				dims.width - legendMargin.x
			) {
				return dims.width - legendMargin.x - 15 - 20 * d.index;
			} else {
				return (
					dims.width * gradientWidth +
					w / 6 +
					legendMargin.x +
					45 -
					20 * d.index
				);
			}
		})
		.attr(
			'y',
			(d) => legendMargin.y + gradientHeight - (w / 6) * d.sideRatio + 10
		)
		.attr('alignment-baseline', 'middle');
};
