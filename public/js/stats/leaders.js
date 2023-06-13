import { createElement } from '../utils/createElementFromSelector.js';
import { getElementArray } from '../utils/getElementArray.js';
import { StateHandler } from '../utils/stateHandler.js';

const leaders = document.querySelector('#leaders');
const tbody = leaders.querySelector('#leaders-body');
const sh = new StateHandler(null);
const newPlayer = (p) => {
	return {
		name: `${p.lastName}, ${p.firstName}`,
		id: p.id,
		points: 0,
		goals: 0,
		assists: 0,
		blocks: 0,
		completions: 0,
		attempts: 0,
		passYards: 0,
		recYards: 0,
		swingYards: 0,
		touches: 0,
		turnovers: 0,
	};
};

const rowLimit = 5;
const stats = [
	'name',
	'points',
	'goals',
	'assists',
	'blocks',
	'completions',
	'attempts',
	{
		name: 'cmp-pct',
		calc: (d) => {
			if (d.attempts === 0) return `N/A`;
			return `${((100 * d.completions) / d.attempts).toFixed(1)}%`;
		},
		sort: (a, b) => {
			if (b.attempts === 0 && a.attempts === 0) return 0;
			else if (b.attempts === 0) return -1;
			else if (a.attempts === 0) return 1;
			else if (b.completions === b.attempts && a.completions === a.attempts)
				return b.attempts - a.attempts;
			return b.completions / b.attempts - a.completions / a.attempts;
		},
	},
	{
		name: 'passYards',
		calc: (d) => {
			return Math.round(d.passYards);
		},
	},
	{
		name: 'recYards',
		calc: (d) => {
			return Math.round(d.recYards);
		},
	},
	'swingYards',
	{
		name: 'totalYards',
		calc: (d) => {
			return Math.round(d.passYards) + Math.round(d.recYards);
		},
	},
	'touches',
	{
		name: 'turnovers',
		calc: (d) => {
			return d.turnovers;
		},
		sort: (a, b) => {
			if (a.turnovers !== b.turnovers) return a.turnovers - b.turnovers;
			if (a.touches !== b.touches) return b.touches - a.touches;
			return 0;
		},
	},
	{
		name: 'tch-per-turn',
		calc: (d) => {
			return d.turnovers === 0
				? 'N/A'
				: `${(d.touches / d.turnovers).toFixed(2)}`;
		},
		sort: (a, b) => {
			if (a.turnovers !== 0 && b.turnovers !== 0)
				return b.touches / b.turnovers - a.touches / a.turnovers;
			else if (b.turnovers === 0 && a.turnovers === 0)
				return b.touches - a.touches;
			else if (a.turnovers === 0) return -1;
			else if (b.turnovers === 0) return 1;
		},
	},
];

const handleColumns = (e) => {
	const tgt = document.querySelector(e.target.getAttribute('data-target'));
	if (!tgt) return;

	const cName = e.target.getAttribute('value');
	tgt.setAttribute('class', `m-auto ${cName}`);

	const state = sh.getState();
	if (!state) return;

	sh.setState({
		...state,
		sort: e.target.getAttribute('data-field'),
	});
};

const toggleAll = (e) => {
	if (e.target.value === 'all') tbody.classList.add('display-all');
	else tbody.classList.remove('display-all');
};

const createCell = (classList, value) => {
	const toReturn = createElement('td');
	classList.forEach((c) => {
		toReturn.classList.add(c);
	});
	toReturn.innerHTML = value;
	return toReturn;
};

sh.addWatcher(leaders, (e) => {
	tbody.innerHTML = '';
	const state = sh.getState();
	if (!state) return;

	const headerRow = getElementArray(document, '#leaders thead th');
	let threshold;
	state.data.forEach((d) => {
		//calculate the calculated fields
		stats.forEach((s, j) => {
			if ((typeof s).toLowerCase() === 'object') {
				d[s.name] = s.calc(d);
			}
		});
	});

	//sort the data
	if (state.sort !== 'all')
		stats.some((s) => {
			if (s === state.sort) {
				state.data.sort((a, b) => {
					return b[state.sort] - a[state.sort];
				});
				return true;
			} else if (
				(typeof s).toLowerCase() === 'object' &&
				s.name === state.sort
			) {
				if (s.sort) {
					state.data.sort(s.sort);
				} else {
					state.data.sort((a, b) => {
						return b[state.sort] - a[state.sort];
					});
				}
				return true;
			}
			return false;
		});
	else
		state.data.sort((a, b) => {
			return a.name.localeCompare(b.name);
		});

	//create the rows
	state.data.forEach((d, i) => {
		let newRow;
		if (i + 1 === rowLimit) threshold = d[state.sort];
		if (i >= rowLimit && d[state.sort] !== threshold)
			newRow = createElement('tr.invisible-row');
		else newRow = createElement('tr');

		//create the cells
		stats.forEach((s, j) => {
			const classes = headerRow[j].classList.value.split(' ');
			let value = '';
			if (typeof s === 'string') {
				if (typeof d[s] === 'string') value = d[s];
				else value = Math.floor(d[s]);
			} else if ((typeof s).toLowerCase() === 'object') value = s.calc(d);
			const c = createCell(classes, value);
			newRow.appendChild(c);
		});

		tbody.appendChild(newRow);
	});
});

getElementArray(leaders, '#stat-selectors > input[type="radio"]').forEach(
	(r) => {
		r.addEventListener('change', handleColumns);
	}
);
getElementArray(leaders, '#toggle-all > input[type="radio"]').forEach((r) => {
	r.addEventListener('change', toggleAll);
});

overview.addEventListener('data-update', (e) => {
	if (!e.detail) return;

	let data = {};
	let passes = [];
	/**
	 * We want an array of these objects:
	 *
	 * {
	 * 		point: [integer]
	 * 		thrower: 'so-and-so',
	 * 		receiver: 'someone-else',
	 * 		defender: '??',
	 * 		dx: yards gained,
	 * 		dy: yards swung,
	 * 		result: [complete, throwaway, drop],
	 * 		goal: [-1,0,1]
	 * }
	 */

	//for every tournament
	e.detail.forEach((t) => {
		//check the roster and add any new players that aren't already in the data
		if (t.games.length > 0 && t.games.find((g) => g.result !== '')) {
			t.roster.forEach((p) => {
				if (!data[p.id]) data[p.id] = newPlayer(p);
			});

			t.games.forEach((g) => {
				g.points.forEach((pt, i) => {
					//points played

					pt.lineup.forEach((pl) => {
						if (data[pl]) data[pl].points++;
						else {
							data[pl] = newPlayer({
								firstName: 'Unknown',
								lastName: 'Unknown',
								id: pl,
							});
							data[pl].points++;
						}
					});
					pt.injuries.forEach((pl) => {
						if (!pt.lineup.includes(pl) && data[pl]) data[pl].points++;
						else if (!data[pl]) {
							data[pl] = newPlayer({
								firstName: 'Unknown',
								lastName: 'Unknown',
								id: pl,
							});
							data[pl].points++;
						}
					});

					let last = null;
					let subIn = null;
					pt.passes.forEach((p, j) => {
						//if we are subbing out the current thrower
						if (p.event === 'sub' && last && p.eventDesc.out === last.player)
							subIn = p.eventDesc.in;
						if (p.event) return;
						if (last) {
							passes.push({
								point: i,
								thrower: subIn || last.player,
								receiver: p.player,
								defender: '',
								x0: last.x,
								y0: last.y,
								x1: p.x,
								y1: p.y,
								result: p.result,
								goal: p.goal,
							});
							last = p.turnover || p.goal ? null : { ...p };
						} else if (p.offense) {
							passes.push({
								point: i,
								thrower: '',
								receiver: p.player,
								defender: '',
								x0: null,
								y0: null,
								x1: p.x,
								y1: p.y,
								result: p.result,
								goal: p.goal,
							});
							last = p.turnover || p.goal ? null : { ...p };
						} else {
							passes.push({
								point: i,
								thrower: '',
								receiver: '',
								defender: p.player,
								x0: null,
								y0: null,
								x1: p.x,
								y1: p.y,
								result: p.result,
								goal: p.goal,
							});
						}
						subIn = null;
					});
				});
			});
		}
	});

	passes.forEach((p) => {
		//goals and assists
		if (p.goal === 1) {
			if (p.thrower && p.receiver) {
				//the usual - goal and assist
				data[p.thrower].assists++;
				data[p.receiver].goals++;
				//the receiver will get a touch recorded as a thrower normally, but not when they score a goal,
				//so do it here
				data[p.receiver].touches++;
			} else if (p.defender) {
				//callahan (the block is recorded below)
				data[p.defender].goals++;
			}
		}

		//blocks
		if (p.defender) data[p.defender].blocks++;

		//throw attempts
		if (p.thrower) {
			data[p.thrower].attempts++;
			data[p.thrower].touches++;
		}

		//completions
		if (p.result === 'complete' && p.thrower && p.receiver) {
			data[p.thrower].completions++;
			//passing and receiving yards
			const dx = p.x1 - p.x0;
			const dy = Math.abs(p.y1 - p.y0);
			data[p.thrower].passYards = data[p.thrower].passYards + dx;
			data[p.receiver].recYards = data[p.receiver].recYards + dx;
			if (dy > dx) data[p.thrower].swingYards = data[p.thrower].swingYards + dy;
		}
		//turnovers
		else if (p.thrower && (p.result === 'throwaway' || p.result === 'stall'))
			data[p.thrower].turnovers++;
		else if (p.receiver && p.result === 'drop') {
			data[p.receiver].turnovers++;
			data[p.receiver].touches++;
		}
	});

	const dataArr = Object.getOwnPropertyNames(data)
		.map((n) => data[n])
		.sort((a, b) => {
			return b.points - a.points;
		});

	const state = sh.getState();
	if (!state) {
		sh.setState({
			data: dataArr,
			sort: 'points',
		});
	} else {
		sh.setState({
			...state,
			data: dataArr,
		});
	}

	// const testid = '07875982-8ee5-4e14-970d-83e1632629ef';

	// e.detail[0].games.forEach((g) => {
	// 	g.points.forEach((pt) => {
	// 		if (pt.lineup.includes(testid) || pt.injuries.includes(testid))
	// 			console.log(pt);
	// 	});
	// });

	// passes.forEach((p) => {
	// 	if (p.receiver === testid) console.log(p);
	// });
});
