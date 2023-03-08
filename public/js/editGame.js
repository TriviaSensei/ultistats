import { getElementArray } from './utils/getElementArray.js';
import { showMessage } from './utils/messages.js';
import { handleRequest } from './utils/requestHandler.js';
import { populateForm } from './utils/populateForm.js';
import { createRosterOption, insertOption } from './utils/rosterOption.js';
import { createElement } from './utils/createElementFromSelector.js';

const dblTouchTime = 500;

const startModal = new bootstrap.Modal(
	document.querySelector('#start-settings-modal')
);
const pointModal = new bootstrap.Modal(
	document.querySelector('#point-setup-modal')
);

const settingsForm = document.querySelector('#game-start-settings');
const submitSettings = settingsForm?.querySelector('button[type="submit"]');

const pointSetup = document.querySelector('#point-settings');
const pointSetupForm = document.querySelector('#point-setup');
const lineSelect = document.querySelector('#line-select');
const lineReset = document.querySelector('#reset-line');
const genderRatioIndicator = document.querySelector('#prescribed-gender-ratio');
const availableContainer = document.querySelector('#available-container');
const moveToLine = document.querySelector('#move-to-line');
const clearLine = document.querySelector('#clear-line');
const lineContainer = document.querySelector('#line-container');
const mCount = document.querySelector('#m-count');
const fCount = document.querySelector('#f-count');
const lineCount = document.querySelector('#line-count');
const genderWarning = document.querySelector('#gender-warning');
const lineWarning = document.querySelector('#line-warning');
const startPoint = document.querySelector('#start-point');

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
		jersey: undefined,
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

const setGenderRatio = (m, f) => {
	if (gameData.genderRule !== 'A') return;

	genderRatioIndicator.innerHTML = `${m}M / ${f}F`;
	genderRatioIndicator.setAttribute('data-m', m);
	genderRatioIndicator.setAttribute('data-f', f);
};

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
				setGenderRatio(
					gameData.genderMax[0],
					gameData.players - gameData.genderMax[0]
				);
			else if (gen === 'f')
				setGenderRatio(
					gameData.players - gameData.genderMax[1],
					gameData.genderMax[1]
				);
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
		jersey: document.querySelector(`input[type="radio"][name="jersey"]:checked`)
			.value,
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
			gameData.startSettings = settings;
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
			populatePointStart(d, o, g);

			updateCounts();
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
				sibling.classList.add('invisible-div');
			} else {
				sibling.classList.remove('invisible-div');
			}
		}
		sibling = sibling.nextSibling;
	}
};

const checkAll = (tgt, select) => {
	const boxes = getElementArray(tgt, 'input[type="checkbox"]');
	boxes.forEach((b) => {
		const style = getComputedStyle(b);
		b.checked = select && style.display === 'block';
	});
	if (boxes.length > 0 && select) handleArrows({ target: boxes[0] });
};

//changes the class of the "move to line" button to point in the right direction
const handleArrows = (e) => {
	if (!e.target.checked) return;

	const container = e.target.closest('.player-container');
	if (container.classList.contains('left-side')) {
		moveToLine.classList.add('move-right');
		moveToLine.classList.remove('move-left');
		const other = container
			.closest('#line-selector')
			?.querySelector('.right-side');
		if (other) checkAll(other, false);
	} else if (container.classList.contains('right-side')) {
		moveToLine.classList.add('move-left');
		moveToLine.classList.remove('move-right');
		const other = container
			.closest('#line-selector')
			?.querySelector('.left-side');
		if (other) checkAll(other, false);
	}
};

//moves a single roster option from one box to the other
const moveOption = (op) => {
	if (!op.classList.contains('roster-option')) return;

	const container = op.closest('.player-container');
	if (!container) return;

	let other;
	if (container.classList.contains('left-side'))
		other = container.closest('#line-selector').querySelector('.right-side');
	else other = container.closest('#line-selector').querySelector('.left-side');

	if (!other) return;

	insertOption(op, other);

	updateCounts();
};

const updateCounts = () => {
	//line count
	const mc = lineContainer.querySelectorAll(
		'.roster-option[data-gender="M"]'
	).length;
	const fc = lineContainer.querySelectorAll(
		'.roster-option[data-gender="F"]'
	).length;
	const lc = lineContainer.querySelectorAll('.roster-option').length;

	if (mCount) mCount.innerHTML = mc;
	if (fCount) fCount.innerHTML = fc;
	if (lineCount) lineCount.innerHTML = lc;

	if (lc !== gameData.players) lineWarning.classList.remove('invisible');
	else lineWarning.classList.add('invisible');

	if (lc <= gameData.players) startPoint.disabled = false;
	else startPoint.disabled = true;

	//make sure the gender ratio isn't violated - if it is, the line can still be played, but a warning will be displayed next to the start point button.
	const maxes = genderRatioIndicator.dataset;
	if (gameData.genderRule !== 'A') {
		genderWarning.classList.add('invisible');
		return;
	} else if (
		lineContainer.querySelectorAll('.roster-option[data-gender="M"]').length >
			parseInt(maxes.m) ||
		lineContainer.querySelectorAll('.roster-option[data-gender="F"]').length >
			parseInt(maxes.f)
	)
		genderWarning.classList.remove('invisible');
	else genderWarning.classList.add('invisible');
};

const handleMoveOptions = (e) => {
	const boxes = getElementArray(
		document,
		'#line-selector input[type="checkbox"]:checked'
	);

	//nothing checked
	if (boxes.length === 0) return;

	if (
		!boxes.every((b, i) => {
			return (
				b.closest('.player-container') === boxes[0].closest('.player-container')
			);
		})
	)
		return showMessage(
			'error',
			'All players must come from the same container'
		);

	const count = lineContainer.querySelectorAll('.roster-option').length;
	if (
		boxes[0].closest('.player-container').classList.contains('left-side') &&
		gameData.players > 0 &&
		boxes.length > gameData.players - count
	)
		return showMessage('error', 'You have selected too many players.');

	boxes.forEach((b) => {
		const op = b.closest('.roster-option');
		moveOption(op);
	});
	updateCounts();
};

const handleMoveOne = (e) => {
	const op = e.target.closest('.roster-option');
	if (!op) return;

	const count = lineContainer.querySelectorAll('.roster-option').length;
	if (
		e.target.closest('.player-container').classList.contains('left-side') &&
		gameData.players > 0 &&
		count >= gameData.players
	)
		return showMessage('error', 'You have selected too many players.');

	moveOption(op);
};

const handleClearLine = (e) => {
	if (e.target !== clearLine) return;

	const opts = getElementArray(lineContainer, '.roster-option');
	opts.forEach((op) => {
		moveOption(op);
	});
};

const handleFilters = (e) => {
	const tgt = document.querySelector(e.target.getAttribute('data-target'));
	if (!tgt) return;

	const cName = e.target.getAttribute('data-toggle');

	if (e.target.checked) tgt.classList.add(cName);
	else tgt.classList.remove(cName);
};

const loadLine = (e) => {
	if (e.target !== lineSelect && e.target !== lineReset) return;

	//if the user chooses the "manual" line, do nothing.
	if (e.target === lineSelect && !lineSelect.value) return;

	//clear the existing line
	handleClearLine({ target: clearLine });
	updateCounts();
	//find the selected line, and if there isn't one, return.
	const line = lines.find((l) => {
		return l.id === lineSelect.value;
	});
	if (!line) return;

	line.players.forEach((p) => {
		const op = availableContainer.querySelector(
			`.roster-option[data-id="${p}"]`
		);
		if (op) moveOption(op);
	});
};

const handleStartPoint = (e) => {
	if (e.target !== pointSetupForm) return;
	e.preventDefault();

	const str = `/api/v1/games/startPoint/${gameData.id}`;
	const body = {
		offense:
			document.querySelector('input[type="radio"][name="od"]:checked')
				?.value === 'true',
		direction: parseInt(
			document.querySelector(
				'input[type="radio"][name="attack-direction"]:checked'
			)?.value
		),
		lineup: getElementArray(lineContainer, `.roster-option`).map((o) => {
			return o.getAttribute('data-id');
		}),
	};

	const handler = (res) => {
		if (res.status === 'success') {
			pointModal.hide();
			const evt = new CustomEvent('new-point', {
				detail: res.data,
			});
			document.dispatchEvent(evt);
			showDiv(actionArea);
		}
	};

	handleRequest(str, 'PATCH', body, handler);

	console.log(body);
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

	lines = getElementArray(lineData, '.line')
		.map((l) => {
			return {
				...l.dataset,
				players: getElementArray(l, '.player').map((p) => {
					return p.getAttribute('data-id');
				}),
			};
		})
		.sort((a, b) => {
			return a.name.localeCompare(b.name);
		});

	console.log(lines);

	roster.forEach((p) => {
		const op = createRosterOption(p, handleArrows);
		op.addEventListener('dblclick', handleMoveOne);
		insertOption(op, availableContainer);
	});

	lines.forEach((l) => {
		const op = createElement('option');
		op.setAttribute('value', l.id);
		op.innerHTML = l.name;
		lineSelect.appendChild(op);
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
	console.log(gameData.startSettings);
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

	moveToLine.addEventListener('click', handleMoveOptions);
	clearLine.addEventListener('click', handleClearLine);

	const filters = getElementArray(
		document,
		`input[type="checkbox"][data-target][data-toggle]`
	);
	filters.forEach((f) => {
		f.addEventListener('change', handleFilters);
	});

	lineSelect.addEventListener('change', loadLine);
	lineReset.addEventListener('click', loadLine);
	pointSetupForm.addEventListener('submit', handleStartPoint);
});
