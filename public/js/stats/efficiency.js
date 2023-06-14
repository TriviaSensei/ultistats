import { getElementArray } from '../utils/getElementArray.js';

const eff = document.querySelector('#eff');

eff.addEventListener('data-update', (e) => {
	if (!e.detail) return;

	const data = {
		points: [0, 0],
		passes: [
			{
				completions: 0,
				attempts: 0,
			},
			{
				completions: 0,
				attempts: 0,
			},
		],
		possessions: [
			{
				goals: 0,
				attempts: 0,
			},
			{
				goals: 0,
				attempts: 0,
			},
		],
		redzonePossessions: [
			{
				goals: 0,
				attempts: 0,
			},
			{
				goals: 0,
				attempts: 0,
			},
		],
	};

	e.detail.data.forEach((t) => {
		const ez = t.format.endzone + t.format.length - t.format.brick;
		t.games.forEach((g) => {
			g.points.forEach((pt) => {
				const line = pt.offense ? 0 : 1;
				let rz = false;
				let throws = 0;
				data.points[line]++;
				pt.passes.forEach((p, i) => {
					//only count when we're on offense
					if (p.offense) {
						//on the first throw of each possession, add a possession
						if (throws === 0) {
							//if we pick it up past the opposing brick, we're in the red zone.
							rz = p.x >= ez;
							data.possessions[line].attempts++;
							if (rz) data.redzonePossessions[line].attempts++;
						}

						//for all but the first throw, add a pass attempt
						if (throws > 0) {
							data.passes[line].attempts++;
							//...and a completion if complete
							if (p.result === 'complete') {
								data.passes[line].completions++;

								//if we scored, increment the goals (and red zone goals, if applicable)
								if (p.goal === 1) {
									if (rz) data.redzonePossessions[line].goals++;
									data.possessions[line].goals++;
								}
								//if we haven't hit the redzone on this possession, and we're there now, add a RZ possession
								else if (!rz && p.x >= ez) {
									rz = true;
									data.redzonePossessions[line].attempts++;
								}
							}
							//remove the attempt if there is no result on a pass
							else if (!p.event && !p.result) {
								data.passes[line].attempts = Math.max(
									0,
									data.passes[line].attempts - 1
								);
							}
						}
						throws++;
					} else {
						throws = 0;
						rz = false;
					}
				});
			});
		});
	});

	const rows = getElementArray(eff, 'tbody > tr');
	rows.forEach((r, i) => {
		//points played
		r.cells[1].innerHTML =
			i === 2 ? data.points[0] + data.points[1] : data.points[i];
		//completion %
		const pct =
			i === 2
				? (data.passes[0].completions + data.passes[1].completions) /
				  (data.passes[0].attempts + data.passes[1].attempts)
				: data.passes[i].completions / data.passes[i].attempts;
		r.cells[2].innerHTML = isNaN(pct) ? 'N/A' : `${(pct * 100).toFixed(1)}%`;
		//poss/goals and eff%
		const poss =
			i === 2
				? data.possessions[0].attempts + data.possessions[1].attempts
				: data.possessions[i].attempts;
		const goal =
			i === 2
				? data.possessions[0].goals + data.possessions[1].goals
				: data.possessions[i].goals;
		r.cells[3].innerHTML = `${goal}/${poss}`;
		r.cells[4].innerHTML =
			poss === 0 ? 'N/A' : `${((100 * goal) / poss).toFixed(1)}%`;

		//poss/goals and eff%
		const rzposs =
			i === 2
				? data.redzonePossessions[0].attempts +
				  data.redzonePossessions[1].attempts
				: data.redzonePossessions[i].attempts;
		const rzgoal =
			i === 2
				? data.redzonePossessions[0].goals + data.redzonePossessions[1].goals
				: data.redzonePossessions[i].goals;
		r.cells[5].innerHTML = `${rzgoal}/${rzposs}`;
		r.cells[6].innerHTML =
			rzposs === 0 ? 'N/A' : `${((100 * rzgoal) / rzposs).toFixed(1)}%`;
	});
});
