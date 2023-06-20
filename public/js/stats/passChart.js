let allData;
const parent = document.querySelector('#pass-chart');
const chartArea = parent.querySelector('.graph-container');

const grid = d3
	.select('#pass-chart > .graph-container')
	.append('svg')
	.attr('id', 'pass-chart-grid')
	.attr('height', '80%')
	.attr('width', '100%');

const legend = d3
	.select('#pass-chart > .graph-container')
	.append('svg')
	.attr('id', 'pass-chart-legend')
	.attr('height', '20%')
	.attr('width', '100%');

const colorScale1 = d3
	.scaleLinear()
	.domain([0, 0.5])
	.range(['#ff0000', '#ffff00']);

const colorScale2 = d3
	.scaleLinear()
	.domain([0.5, 1])
	.range(['#ffff00', '#00bf30']);

const textScale1 = d3.scaleLinear().domain([0, 0.5]).range(['white', 'black']);
const textScale2 = d3.scaleLinear().domain([0.5, 1]).range(['black', 'white']);

const colorScale3 = d3
	.scaleLinear()
	.domain([0, 1])
	.range(['ff0000', '#ffff00', '#00bf30']);

const colorScale = (x) => {
	if (x <= 0.5) return colorScale1(x);
	else if (x <= 1) return colorScale2(x);
	else return null;
};
const textScale = (x) => {
	if (x <= 0.5) return textScale1(x);
	else if (x <= 1) return textScale2(x);
	else return null;
};
const t = d3.transition().duration(200);
let gridChart;
let x, y;
let h, w;

const margin = {
	bottom: 50,
	top: 10,
	left: null,
	right: null,
};

parent.addEventListener(
	'init',
	(e) => {
		const chartAll = parent.querySelector(
			'.graph-container > #pass-chart-grid'
		);
		let dims = chartAll.getBoundingClientRect();

		h = dims.height - margin.bottom - margin.top;
		w = h * 1.2;

		if (w > dims.width) {
			w = dims.width - margin.bottom - margin.top;
			h = w / 1.2;
		}
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
				return ['◀21+', '◀11-20', '◀1-10', '▶0-9', '▶10-19', '▶20+'][i];
			});

		//x-axis
		const xAxis = gridChart
			.append('g')
			.attr('class', 'x axis')
			.attr('transform', `translate(0,${h})`)
			.call(xAxisCall);

		//x-label
		gridChart
			.append('text')
			.text('Yards swung')
			.attr('x', w / 2)
			.attr('y', h + 40)
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

		// let x = 0;
		// for (var i = 0; i < 6; i++) {
		// 	for (var j = 0; j < 5; j++) {
		// 		gridChart
		// 			.append('rect')
		// 			.attr('height', h / 5)
		// 			.attr('width', h / 5)
		// 			.attr('fill', colorScale(x))
		// 			.attr('transform', `translate(${(i * h) / 5},${(j * h) / 5})`);
		// 		gridChart
		// 			.append('text')
		// 			.text(x.toFixed(2))
		// 			.attr('stroke', 'black')
		// 			.attr('text-anchor', 'middle')
		// 			.attr(
		// 				'transform',
		// 				`translate(${(i * h) / 5 + h / 10},${(j * h) / 5 + 30})`
		// 			);
		// 		x = x + 1 / 30;
		// 	}
		// }
	},
	{ once: true }
);

let grp;

parent.addEventListener('data-update', (e) => {
	allData = e.detail.filter((p) => {
		return p.thrower;
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

	const rects = gridChart.selectAll('rect').data(grp, (d) => d.group);
	rects.exit().remove();
	rects
		.enter()
		.append('rect')
		.on('mouseover', showTip)
		.on('mouseout', hideTip)
		.attr('data-info', (d) => {
			console.log(d);
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

	const disc = gridChart.select('circle');
	if (!disc || !disc._groups[0][0])
		gridChart
			.append('circle')
			.attr('stroke', 'black')
			.attr('fill', 'white')
			.attr('cx', x(0))
			.attr('cy', y(0))
			.attr('r', 5);
};
