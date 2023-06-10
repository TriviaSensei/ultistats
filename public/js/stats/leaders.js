const leaders = document.querySelector('#leaders');
const tbody = leaders.querySelector('#leaders-table > tbody');

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
		touches: 0,
		turnovers: 0,
	};
};

overview.addEventListener('data-update', (e) => {
	if (!e.detail) return;

	console.log(e.detail);

	let data = [];

	//for every tournament
	e.detail.forEach((t) => {
		//check the roster and add any new players that aren't already in the data
		t.roster.forEach((p) => {
			if (
				!data.find((d) => {
					return d.id === p.id;
				})
			)
				data.push(newPlayer(p));
		});

		t.games.forEach((g) => {
			g.points.forEach((pt) => {
				let last = null;
				pt.passes.forEach((p, i) => {});
			});
		});
	});
});
