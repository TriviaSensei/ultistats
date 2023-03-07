import { getElementArray } from './utils/getElementArray.js';
import { showMessage } from './utils/messages.js';
import { handleRequest } from './utils/requestHandler.js';
import { populateForm } from './utils/populateForm.js';
import { createRosterOption, insertOption } from './utils/rosterOption.js';

const startModal = new bootstrap.Modal(
	document.querySelector('#start-settings-modal')
);

const field = document.querySelector('#field-canvas');
const settingsForm = document.querySelector('#game-start-settings');
const submitSettings = settingsForm?.querySelector('button[type="submit"]');
const lastEvent = document.querySelector('#event-desc');

const pointSetup = document.querySelector('#point-settings');
const genderRatioIndicator = document.querySelector('#prescribed-gender-ratio');
const availableContainer = document.querySelector('#available-container');

const actionArea = document.querySelector('#action-div');

//game/tournament data
let roster = [];
let lines = [];
//todo: handle restoring number of timeouts left
let gameData = {
	id: undefined,
	cap: undefined,
	hardCap: undefined,
	winBy: undefined,
	division: undefined,
	genderRule: undefined,
	genderMax: [],
	allowPeriodEnd: undefined,
	players: undefined,
	periods: undefined,
	timeouts: undefined,
	period: undefined,
	team: undefined,
	opponent: undefined,
	result: undefined,
	score: 0,
	oppScore: 0,
	points: [],
	currentPoint: {
		score: undefined,
		oppScore: undefined,
		offense: undefined,
		direction: undefined,
		scored: undefined,
		period: undefined,
		endPeriod: undefined,
		lineup: [],
		injuries: [],
		passes: [],
	},
	startSettings: {
		offense: undefined,
		genderRatio: undefined,
		direction: undefined,
	},
};

const dataArea = document.querySelector('#data-area');
const rosterData = document.querySelector('#roster-data');
const lineData = document.querySelector('#line-data');

//controls
const undo = document.querySelector('#undo');
const redo = document.querySelector('#redo');

function toNearestHalf(n) {
	return parseFloat((Math.round(n + 0.5) - 0.5).toFixed(1));
}

const populatePointStart = (dir, off, gen) => {
	const r = document.querySelector(
		`input[name="attack-direction"][value="${dir}"]`
	);
	if (r) r.checked = true;

	const o = document.querySelector(`input[name="od"][value="${off}"]`);
	if (o) o.checked = true;

	//gender rule A - alternate GR every two points (1 - 23 - 45 - ...)
	if (gameData.genderRule === 'A') {
		if (gen && genderRatioIndicator) {
			if (gen === 'm')
				genderRatioIndicator.innerHTML = `${gameData.genderMax[0]}M / ${
					gameData.players - gameData.genderMax[0]
				}F`;
			else if (gen === 'f')
				genderRatioIndicator.innerHTML = `${
					gameData.players - gameData.genderMax[1]
				}M / ${gameData.genderMax[1]}F`;
		}
	} else if (gameData.genderRule === 'B') {
		//gender rule B - first half is one endzone dictating, second half is other endzone dictating
		if (gen && genderRatioIndicator) {
			genderRatioIndicator.innerHTML = `${gen} decide`;
		}
	} else if (gameData.genderRule === 'X') {
		if (off) {
			genderRatioIndicator.innerHTML = `You decide`;
		} else {
			genderRatioIndicator.innerHTML = `They decide`;
		}
	} else if (genderRatioIndicator) {
		genderRatioIndicator.innerHTML = '';
	}
};

const handleSaveSettings = (e) => {
	if (e.target !== settingsForm) return;
	e.preventDefault();

	const settings = {
		offense: document.querySelector(
			`input[type="radio"][name="start-on"]:checked`
		)?.value,
		genderRatio: document.querySelector(
			`input[type="radio"][name="start-gender"]:checked`
		)?.value,
		genderRatioChoice:
			gameData.genderRule === 'B'
				? document.querySelector(
						`input[type="radio"][name="gender-b-choice"]:checked`
				  )?.value === 'true'
				: undefined,
		direction: parseInt(
			document.querySelector(
				`input[type="radio"][name="start-direction"]:checked`
			)?.value
		),
	};

	const str = `/api/v1/games/${gameData.id}`;
	const handler = (res) => {
		if (res.status === 'success') {
			startModal.hide();
			actionArea.classList.remove('invisible');
			showMessage(`info`, 'Settings saved.');
			//no point has been played
			let d, o, g;
			if (gameData.currentPoint.direction === undefined)
				[d, o] = [settings.direction, settings.offense];
			else if (gameData.currentPoint.endPeriod) {
				//the last point ended a period
				if (gameData.currentPoint.period % 2 === 1) {
					d = -gameData.startSettings.direction;
					o = !gameData.startSettings.offense;
				} else {
					d = gameData.startSettings.direction;
					o = gameData.startSettings.offense;
				}
			} else {
				//the last point did not end the period.
				d = -gameData.currentPoint.direction;
				o = gameData.currentPoint.scored === -1;
			}
			console.log(res.data);

			if (gameData.division === 'Mixed') {
				if (gameData.genderRule === 'A') {
					if (gameData.currentPoint.score === undefined)
						g = gameData.startSettings.genderRatio;
					else if (
						(gameData.currentPoint.score + gameData.currentPoint.oppScore) %
							4 <=
						1
					) {
						g = gameData.startSettings.genderRatio === 'm' ? 'f' : 'm';
					} else {
						g = gameData.startSettings.genderRatio;
					}
				} else if (gameData.genderRule === 'B') {
					//who got the first choice? (true = us, false = them)
					const firstChoice = gameData.startSettings.genderRatioChoice;
					//how many points have been played this period?
					let pp = 0;
					for (var j = res.data.points.length - 1; j >= 0; j--) {
						if (res.data.points[j].periodEnd) break;
						pp++;
					}
					g = firstChoice && pp % 2 === 0 ? 'You' : 'They';
				} else if (gameData.genderRule === 'X') {
					g = o ? 'You' : 'They';
				}
			}
			console.log(g);
			populatePointStart(d, o, g);

			gameData.startSettings = settings;
		} else {
			showMessage('error', res.message);
		}
	};
	const body = {
		startSettings: {
			...settings,
			offense: settings.offense.toLowerCase() === 'true',
		},
	};
	handleRequest(str, 'PATCH', body, handler);
};

const validateSettings = () => {
	if (
		settingsForm.querySelector(`input[name="start-on"]:checked`) &&
		(gameData.division !== 'Mixed' ||
			((gameData.genderRule !== 'B' ||
				settingsForm.querySelector(`input[name="gender-b-choice"]:checked`)) &&
				settingsForm.querySelector(`input[name="start-gender"]:checked`))) &&
		settingsForm.querySelector(`input[name="start-direction"]:checked`)
	) {
		submitSettings.disabled = false;
	} else submitSettings.disabled = true;
};

const showDiv = (node) => {
	let parent = node.parentElement;
	if (!parent) return;
	let sibling = parent.firstChild;
	while (sibling) {
		if (sibling.nodeType === 1) {
			if (sibling !== node) {
				sibling.classList.add('invisible');
			} else {
				sibling.classList.remove('invisible');
			}
		}
		sibling = sibling.nextSibling;
	}
};

const showEvent = (msg) => {
	lastEvent.innerHTML = msg;
};

document.addEventListener('DOMContentLoaded', () => {
	//get the roster and lines
	roster = getElementArray(rosterData, '.player')
		.map((p) => {
			return p.dataset;
		})
		.sort((a, b) => {
			return parseInt(a.number) - parseInt(b.number);
		});

	lines = getElementArray(lineData, '.line').map((l) => {
		return {
			...l.dataset,
			players: getElementArray(l, '.player').map((p) => {
				return p.id;
			}),
		};
	});

	roster.forEach((p) => {
		insertOption(createRosterOption(p, null), availableContainer);
	});

	//get the gender rule, team names, and game ID for calling the API
	gameData.genderRule = document
		.querySelector('#gender-data')
		.getAttribute('data-rule');
	gameData.team = document.querySelector('#our-name').getAttribute('data-name');
	gameData.opponent = document
		.querySelector('#their-name')
		.getAttribute('data-name');
	gameData.id = document.querySelector('#game-data').getAttribute('data-value');

	if (!gameData.id) {
		showMessage(`error`, `Game Id not valid`);
		setTimeout(() => {
			location.href = '/mystuff';
		}, 1000);
	}
	//game start settings
	const settings = document.querySelector('#start-settings').dataset;
	gameData.startSettings = {
		...settings,
		direction: parseInt(settings.direction),
		genderRatioChoice:
			settings.genderRatioChoice === 'true'
				? true
				: settings.genderRatioChoice === 'false'
				? false
				: undefined,
		offense:
			settings.offense === 'true'
				? true
				: settings.offense === 'false'
				? false
				: undefined,
	};
	//game format settings
	const formatSettings = document.querySelector('#format-settings')?.dataset;
	if (formatSettings) {
		gameData.genderMax = [
			parseInt(formatSettings.maxMale),
			parseInt(formatSettings.maxFemale),
		];
		gameData.allowPeriodEnd = formatSettings.allowPeriodEnd === 'true';
		gameData.players = parseInt(formatSettings.players);
		gameData.periods = parseInt(formatSettings.periods);
	}

	//division - only really important if mixed
	gameData.division = document
		.querySelector('#division')
		.getAttribute('data-value');
	//populate the start settings
	populateForm(settingsForm, gameData.startSettings);
	//validate the start settings and enable the save button if valid
	validateSettings();

	const currentPoint = document.querySelector('#current-point')?.dataset;
	if (currentPoint) {
		gameData.currentPoint = {
			...gameData.currentPoint,
			score: parseInt(currentPoint.score),
			oppScore: parseInt(currentPoint.oppScore),
			direction: parseInt(currentPoint.direction),
			offense: currentPoint.offense === 'true',
			scored: parseInt(currentPoint.scored),
		};
	}

	//points played
	const pts = getElementArray(document, `#point-data > .point`);
	pts.forEach((p) => {
		gameData.points.push({
			score: parseInt(p.score),
			oppScore: parseInt(p.oppScore),
			endPeriod: p.endPeriod === 'true',
			scored: parseInt(p.scored),
			offense: p.offense === 'true',
		});
	});

	//remove the temporary data area
	// dataArea.remove();
	showMessage(
		`info`,
		`Entering game ${gameData.team} vs. ${gameData.opponent}`
	);

	console.log(gameData);
	/*

	Start view 
		- Settings modal - if game start settings aren't set
		- Point settings - if we're at the start of a point. User can change ^^game settings or set a line
		- Edit view - we are in the middle of a point (the pull has occurred iff there's an event in the event array with a receiver, which signifies the pull being caught/picked up)

	if there are any missing start settings, the user has to set them before starting the game:
	boolean: offense - whether we start on offense
	genderRatio: [m,f] - starting gender majority. Only required if the game is a mixed division game
	direction: [-1,1] - direction we are attacking first. 1 for moving right, -1 for moving left.
	*/
	if (
		//whether we start on offense
		!gameData.startSettings.offense === undefined ||
		//mixed division AND (no gender ratio OR starting GR choice not defined with rule B in place)
		((!gameData.startSettings.genderRatio ||
			(gameData.startSettings.genderRatioChoice === undefined &&
				gameData.genderRule === 'B')) &&
			gameData.division === 'Mixed') ||
		//no valid start direction defined
		(gameData.startSettings.direction !== -1 &&
			gameData.startSettings.direction !== 1)
	) {
		startModal.show();
	}

	if (
		gameData.currentPoint.direction === undefined ||
		gameData.currentPoint.scored !== 0
	) {
		//populate the new point setup modal
		//if no point has been played, use the start settings
		if (gameData.currentPoint.direction === undefined) {
			populatePointStart(
				gameData.startSettings.direction,
				gameData.startSettings.offense,
				gameData.startSettings.genderRatio
			);
		} else {
			//at least one point has been played. Check if the last point ended a period
			if (gameData.currentPoint.endPeriod) {
				const newPeriod = gameData.currentPoint.period + 1;
				//2nd (and 4th in the AUDL) period reverses the possession/positions of the first point
				if (gameData.division === 'Mixed') {
					let g;
					if (gameData.genderRule === 'A') {
						if (gameData.currentPoint.score === undefined)
							g = gameData.startSettings.genderRatio;
						else if (
							(gameData.currentPoint.score + gameData.currentPoint.oppScore) %
								4 <=
							1
						) {
							g = gameData.startSettings.genderRatio === 'm' ? 'f' : 'm';
						} else {
							g = gameData.startSettings.genderRatio;
						}
					} else if (gameData.genderRule === 'B') {
						//who got the first choice? (true = us, false = them)
						const firstChoice = gameData.startSettings.genderRatioChoice;
						//how many points have been played this period?
						let pp = 0;
						for (var j = gameData.points.length - 1; j >= 0; j--) {
							if (gameData.points[j].periodEnd) break;
							pp++;
						}
						g = firstChoice && pp % 2 === 0 ? 'You' : 'They';
					} else if (gameData.genderRule === 'X') {
						g = o ? 'You' : 'They';
					}
					if (newPeriod % 2 === 0) {
						populatePointStart(
							-gameData.startSettings.direction,
							!gameData.startSettings.offense,
							g
						);
					} else {
						populatePointStart(
							gameData.startSettings.direction,
							gameData.startSettings.offense,
							g
						);
					}
				} else if (newPeriod % 2 === 0) {
					populatePointStart(
						-gameData.startSettings.direction,
						!gameData.startSettings.offense
					);
				} else {
					populatePointStart(
						gameData.startSettings.direction,
						gameData.startSettings.offense
					);
				}
			}
			//change direction from this point, if we got scored on (scored = -1), then we're on offense.
			else
				populatePointStart(
					-gameData.currentPoint.direction,
					gameData.currentPoint.scored === -1
				);
		}
		/**
		 * If there has not been a point played, or if the last point played has ended, but we haven't started a new one, show the point start view
		 */
		showDiv(pointSetup);
	}

	settingsForm.addEventListener('change', validateSettings);
	settingsForm.addEventListener('submit', handleSaveSettings);
});
