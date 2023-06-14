const overview = document.querySelector('#overview');
const w = document.querySelector('#wins');
const l = document.querySelector('#losses');
const goalsFor = document.querySelector('#gf');
const goalsAgainst = document.querySelector('#ga');

overview.addEventListener('data-update', (e) => {
	if (!e.detail) return;
	let wins = 0;
	let losses = 0;
	let gf = 0;
	let ga = 0;

	e.detail.data.forEach((t) => {
		t.games.forEach((g) => {
			if (g.result === 'W') wins++;
			else if (g.result === 'L') losses++;

			gf = gf + g.score;
			ga = ga + g.oppScore;
		});
	});

	w.innerHTML = wins;
	l.innerHTML = losses;
	goalsFor.innerHTML = gf;
	goalsAgainst.innerHTML = ga;
});
