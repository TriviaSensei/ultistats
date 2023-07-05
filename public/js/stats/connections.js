import { createElement } from '../utils/createElementFromSelector.js';
import { getElementArray } from '../utils/getElementArray.js';
const parent = document.querySelector('#connections');
const tip = document.querySelector('#tip');
const chartArea = parent.querySelector('.graph-container');
const lineSelect = document.querySelector('#node-line-select');
const playerSelect = document.querySelector('#node-player-select');

let chart;
let dims;
let allData, allGraphData, allPasses;

let simulation, link, node;

const ticked = () => {
	link
		.attr('x1', function (d) {
			return d.source.x;
		})
		.attr('y1', function (d) {
			return d.source.y;
		})
		.attr('x2', function (d) {
			return d.target.x;
		})
		.attr('y2', function (d) {
			return d.target.y;
		});

	node
		.attr('cx', function (d) {
			return d.x;
		})
		.attr('cy', function (d) {
			return d.y;
		});
};
const genderColorScale = d3
	.scaleOrdinal()
	.domain(['M', 'F', 'P'])
	.range(['var(--blue)', 'var(--pink)', '#ff9e17']);

const filterByLine = (e) => {
	playerSelect.selectedIndex = 0;
	const lineId = lineSelect.value;
	if (lineId === '') return update(allGraphData);
	let line = [];
	allData.tournaments.some((t) => {
		if (lineId === 'O' || lineId === 'D') {
			t.roster.forEach((p) => {
				if (p.line === lineId && line.every((pl) => pl !== p.id))
					line.push(p.id);
			});
			return false;
		} else {
			const l = t.lines.find((li) => li.id === lineId);
			if (l) {
				line = l.players;
				return true;
			}
		}
	});
	const data = generateGraphData(allData, { line });
	update(data);
};

const filterByPlayer = (e) => {
	lineSelect.selectedIndex = 0;
	const id = playerSelect.value;
	if (id === '') return update(allGraphData);

	const data = generateGraphData(allData, { id });

	update(data);
};

parent.addEventListener(
	'init',
	() => {
		chartArea.innerHTML = '';
		chart = d3
			.select(`#connections .graph-container`)
			.append('svg')
			.attr('id', 'connections-graph')
			.attr('width', '100%')
			.attr('height', '100%');
		dims = document
			.querySelector('#connections .graph-container')
			.getBoundingClientRect();
		playerSelect.addEventListener('change', filterByPlayer);
		lineSelect.addEventListener('change', filterByLine);
	},
	{ once: true }
);

const showTip = (e) => {
	tip.innerHTML = e.target.getAttribute('data-info');
	const r = e.target.getBoundingClientRect();

	tip.classList.remove('d-none');
	const rect = tip.getBoundingClientRect();
	if (e.type === 'edge')
		tip.style = `left:${r.left - rect.width / 2 + r.width / 2}px;top:${
			r.top + rect.height / 2 + 10
		}px;`;
	else if (e.type === 'node')
		tip.style = `left:${r.left - rect.width / 2 + r.width / 2}px;top:${
			r.bottom + 10
		}px;`;
	tip.classList.add('s');
};

const hideTip = (e) => {
	tip.innerHTML = '';
	tip.classList.add('d-none');
	tip.classList.remove('s');
};

const generateGraphData = (data, filter) => {
	const nodes = [];
	const links = [];
	data.tournaments.forEach((t) => {
		if (t.games.length === 0) return;
		t.roster.forEach((p) => {
			if (!nodes.find((pl) => pl.id === p.id))
				if (filter)
					nodes.push({
						id: p.id,
						name: p.name,
						line: p.line,
						gender: p.gender,
						connections: 0,
						index: nodes.length,
					});
				else
					nodes.push({
						id: p.id,
						name: p.name,
						line: p.line,
						gender: p.gender,
						touches: 0,
						index: nodes.length,
					});
		});
	});

	data.passes.forEach((p) => {
		if (filter) {
			//if an ID is specified, get rid of anything that isn't involving that player

			if (filter.id && filter.id !== p.receiver && filter.id !== p.thrower)
				return;

			//if a line is specified, get rid of anything that isn't between players on that line
			if (
				filter.line &&
				(!filter.line.includes(p.receiver) || !filter.line.includes(p.thrower))
			)
				return;
		}
		if (p.receiver) {
			if (filter) {
				if (filter.id) {
					if (p.thrower && p.thrower !== p.receiver) {
						//we have a thrower and receiver, and they're not the same person, and one of them is the selected player
						const otherId = p.thrower === filter.id ? p.receiver : p.thrower;
						//credit that player with a connection
						nodes.some((pl) => {
							if (pl.id === otherId) {
								pl.connections++;
								return true;
							}
						});
						if (
							!links.find((l) => {
								if (
									(l.source === p.thrower && l.target === p.receiver) ||
									(l.target === p.thrower && l.source === p.receiver)
								) {
									l.value++;
									return true;
								}
							})
						) {
							links.push({
								source: p.thrower,
								target: p.receiver,
								value: 1,
							});
						}
					}
				} else if (filter.line) {
					if (p.thrower && p.thrower !== p.receiver) {
						if (
							filter.line.includes(p.thrower) &&
							filter.line.includes(p.receiver)
						) {
							let x = 0;
							nodes.some((pl) => {
								if (pl.id === p.thrower || pl.id === p.receiver) {
									pl.connections++;
									x++;
									if (x === 2) return true;
								}
							});
						}
						if (
							!links.find((l) => {
								if (
									(l.source === p.thrower && l.target === p.receiver) ||
									(l.target === p.thrower && l.source === p.receiver)
								) {
									l.value++;
									return true;
								}
							})
						) {
							links.push({
								source: p.thrower,
								target: p.receiver,
								value: 1,
							});
						}
					}
				}
			} else {
				nodes.some((pl) => {
					if (pl.id === p.receiver) {
						pl.touches++;
						return true;
					}
				});
				if (p.thrower) {
					if (
						!links.find((l) => {
							if (
								(l.source === p.thrower && l.target === p.receiver) ||
								(l.target === p.thrower && l.source === p.receiver)
							) {
								l.value++;
								return true;
							}
						})
					) {
						links.push({
							source: p.thrower,
							target: p.receiver,
							value: 1,
						});
					}
				}
			}
		}
	});
	if (!filter) {
		const toReturn = {
			nodes: [...nodes].filter((n) => n.touches > 0),
			links: [...links],
		};

		return toReturn;
	} else if (filter.id) {
		const toReturn = {
			nodes: [...nodes].filter((n) => n.connections > 0 || n.id === filter.id),
			links: [...links],
		};

		return toReturn;
	} else if (filter.line) {
		const toReturn = {
			nodes: [...nodes].filter(
				(n) => filter.line.includes(n.id) && n.connections > 0
			),
			links: [...links],
		};
		return toReturn;
	} else return null;
};

const getPasses = (id) => {
	let passes = allPasses.filter((p) => p.receiver === id || p.thrower === id);
	console.log(passes);
};

parent.addEventListener('data-update', (e) => {
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

	//remove all lines from the line selector
	getElementArray(lineSelect, 'option:not([value=""])').forEach((op) =>
		op.remove()
	);

	//get all lines
	let lines = [
		{ name: 'Offense (all)', value: 'O', players: [] },
		{ name: 'Defense (all)', value: 'D', players: [] },
	];

	let tCount = e.detail.tournaments.reduce((p, c) => {
		if (c.games.length === 0) return p;
		return p + 1;
	}, 0);

	if (tCount === 1) {
		e.detail.tournaments.forEach((t) => {
			if (t.games.length === 0) return;
			t.lines
				.sort((a, b) => a.name.localeCompare(b.name))
				.forEach((l) => {
					lines.push({
						name: l.name,
						value: l.id,
						players: l.players.sort((a, b) => a.localeCompare(b)),
						tournamentName: t.name,
						tournamentId: t._id,
					});
				});
		});
	}

	lines.forEach((l) => {
		const op = createElement('option');
		op.innerHTML = l.name;
		op.setAttribute('value', l.value);
		op.setAttribute('data-players', l.players.join(','));
		lineSelect.appendChild(op);
	});

	if (!dims) return;

	allData = e.detail;

	const data = generateGraphData(allData, null);

	allGraphData = data;
	allPasses = e.detail.passes;
	update(data);
});

const update = (data) => {
	if (!dims) return;
	const chartArea = parent.querySelector('svg');
	chartArea.innerHTML = '';
	const touchScale = d3
		.scaleSqrt()
		.domain(d3.extent(data.nodes, (d) => d.touches || d.connections))
		.range([5, 10]);

	simulation = d3
		.forceSimulation(data.nodes)
		.force(
			'link',
			d3.forceLink(data.links).id((d) => d.id)
		)
		.force('charge', d3.forceManyBody().strength(-20))
		.force('collide', d3.forceCollide(10).strength(0.9))
		.force(
			'center',
			d3.forceCenter(dims.width / 2, dims.height / 2).strength(1)
		);

	const link = chart
		.append('g')
		.selectAll()
		.data(data.links)
		.enter()
		.append('line')
		.attr('class', 'links')
		.attr('stroke', '#bbb')
		.attr('data-source', (d) => d.source.id)
		.attr('data-target', (d) => d.target.id)
		.attr(
			'data-info',
			(d) => `${d.source.name} ↔ ${d.target.name}<br>Passes: ${d.value}`
		)
		.attr('stroke-width', (d) => Math.pow(d.value, 0.75))
		.on('mouseover', (e) => {
			e.target.setAttribute('stroke', '#000');
			const c1 = parent.querySelector(
				`circle[data-id="${e.target.getAttribute('data-source')}"]`
			);
			const c2 = parent.querySelector(
				`circle[data-id="${e.target.getAttribute('data-target')}"]`
			);
			if (c1) c1.setAttribute('stroke', '#000');
			if (c2) c2.setAttribute('stroke', '#000');
			showTip({ target: e.target, type: 'edge' });
		})
		.on('mouseout', (e) => {
			e.target.setAttribute('stroke', '#bbb');
			const c1 = parent.querySelector(
				`circle[data-id="${e.target.getAttribute('data-source')}"]`
			);
			const c2 = parent.querySelector(
				`circle[data-id="${e.target.getAttribute('data-target')}"]`
			);
			if (c1) c1.setAttribute('stroke', '#fff');
			if (c2) c2.setAttribute('stroke', '#fff');
			hideTip({ target: e.target });
		});

	const node = chart
		.append('g')
		.attr('stroke', '#fff')
		.attr('stroke-width', 1.5)
		.selectAll()
		.data(data.nodes)
		.join('circle')
		.attr('data-id', (d) => d.id)
		.attr('r', (d) => {
			return touchScale(
				d.touches !== undefined
					? d.touches
					: d.connections === 0
					? (touchScale.domain()[0] + touchScale.domain()[1]) / 2
					: d.connections
			);
		})
		.attr('fill', (d) => genderColorScale(d.gender))
		.attr('data-info', (d) => {
			let str = d.name;
			if (d.touches) str = str + `<br>Touches: ${d.touches}`;
			else if (d.connections > 0)
				str = str + `<br>Connections: ${d.connections}`;
			return str;
		})
		.on('mouseover', (e) => {
			showTip({ target: e.target, type: 'node' });
		})
		.on('mouseout', hideTip);

	node.call(
		d3.drag().on('start', dragstarted).on('drag', dragged).on('end', dragended)
	);

	const nodePadding = 10;
	function ticked() {
		node
			.attr('cx', (d) =>
				d.x < nodePadding
					? nodePadding
					: d.x > dims.width - nodePadding
					? dims.width - nodePadding
					: d.x
			)
			.attr('cy', (d) =>
				d.y < nodePadding
					? nodePadding
					: d.y > dims.height - nodePadding
					? dims.height - nodePadding
					: d.y
			);
		link
			.attr('x1', (d) =>
				Math.min(Math.max(nodePadding, d.source.x), dims.width - nodePadding)
			)
			.attr('y1', (d) =>
				Math.min(Math.max(nodePadding, d.source.y), dims.height - nodePadding)
			)
			.attr('x2', (d) =>
				Math.min(Math.max(nodePadding, d.target.x), dims.width - nodePadding)
			)
			.attr('y2', (d) =>
				Math.min(Math.max(nodePadding, d.target.y), dims.height - nodePadding)
			);
	}

	simulation.on('tick', ticked);
	// Reheat the simulation when drag starts, and fix the subject position.
	function dragstarted(event) {
		if (!event.active) simulation.alphaTarget(0.3).restart();
		d3.select(this).attr('stroke', 'black');
		event.subject.fx = event.subject.x;
		event.subject.fy = event.subject.y;
	}

	// Update the subject (dragged node) position during drag.
	function dragged(event) {
		const [dx, dy] = [event.x - event.subject.fx, event.y - event.subject.fy];
		const rect = tip.getBoundingClientRect();
		tip.style = `top: ${rect.top + dy}px;left: ${rect.left + dx}px`;
		event.subject.fx = event.x;
		event.subject.fy = event.y;
		event.subject.x = event.x;
		event.subject.y = event.y;
	}

	// Restore the target alpha so the simulation cools after dragging ends.
	// Unfix the subject position now that it’s no longer being dragged.
	function dragended(event) {
		if (!event.active) simulation.alphaTarget(0);
		d3.select(this).attr('stroke', '#fff');
		event.subject.fx = null;
		event.subject.fy = null;
	}

	// simulation.alphaTarget(0.1).restart();
};
