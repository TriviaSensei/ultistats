import { getElementArray } from './utils/getElementArray.js';
import { showMessage } from './utils/messages.js';
import { StateHandler } from './utils/stateHandler.js';
import { handleRequest } from './utils/requestHandler.js';
import { populateForm } from './utils/populateForm.js';
import { createRosterOption, insertOption } from './utils/rosterOption.js';
import { createElement } from './utils/createElementFromSelector.js';
import { showDiv } from './utils/showDiv.js';
const dblTouchTime = 500;

const startModal = new bootstrap.Modal(
	document.querySelector('#start-settings-modal')
);
const pointModal = new bootstrap.Modal(
	document.querySelector('#point-setup-modal')
);

const settingsForm = document.querySelector('#game-start-settings');
const cancelSaveSettings = document.querySelector('#cancel-save-settings');
const submitSettings = settingsForm?.querySelector('button[type="submit"]');

const pointSetup = document.querySelector('#point-settings');
const pointSetupForm = document.querySelector('#point-setup');
const lineSelect = document.querySelector('#line-select');
const lineReset = document.querySelector('#reset-line');
const scoreboard = document.querySelector('#score-bug');
const setupScoreboard = document.querySelector('#setup-scoreboard');
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
const endPeriod = document.querySelector('#end-period-button');
const dataArea = document.querySelector('#data-area');

//controls
const undo = document.querySelector('#undo');
const redo = document.querySelector('#redo');

const actionArea = document.querySelector('#action-div');

let isMobile = false;
//game/tournament data

let gameData;
let sh;
const getState = () => {
	return sh ? sh.getState() : undefined;
};

function toNearestHalf(n) {
	return parseFloat((Math.round(n + 0.5) - 0.5).toFixed(1));
}

const getIds = (o) => {
	return o.getAttribute('data-id');
};

const setGenderRatio = (m, f) => {
	const state = getState();
	if (!state) return;

	if (state.genderRule !== 'A') return;
	genderRatioIndicator.innerHTML = `${m}M / ${f}F`;
	genderRatioIndicator.setAttribute('data-m', m);
	genderRatioIndicator.setAttribute('data-f', f);
};

const populatePointStart = (dir, off, gen) => {
	const state = getState();
	if (!state) return;

	const r = document.querySelector(
		`input[name="attack-direction"][value="${dir}"]`
	);
	if (r) r.checked = true;

	const o = document.querySelector(`input[name="od"][value="${off}"]`);
	if (o) o.checked = true;

	//gender rule A - alternate GR every two points (1 - 23 - 45 - ...)
	if (state.genderRule === 'A') {
		if (gen && genderRatioIndicator) {
			if (gen === 'm')
				setGenderRatio(
					state.format.genderMax[0],
					state.format.players - state.format.genderMax[0]
				);
			else if (gen === 'f')
				setGenderRatio(
					state.format.players - state.format.genderMax[1],
					state.format.genderMax[1]
				);
		}
	} else if (state.genderRule === 'B') {
		//gender rule B - first half is one endzone dictating, second half is other endzone dictating
		if (gen && genderRatioIndicator) {
			genderRatioIndicator.innerHTML = `${gen} decide`;
		}
	} else if (state.genderRule === 'X') {
		if (off) {
			genderRatioIndicator.innerHTML = `You decide`;
		} else {
			genderRatioIndicator.innerHTML = `They decide`;
		}
	} else if (genderRatioIndicator) {
		genderRatioIndicator.innerHTML = '';
	}
};

const restoreSettings = (e) => {
	if (e.target !== cancelSaveSettings) return;
	e.preventDefault();
	populateForm(settingsForm, gameData.startSettings);
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

	const str = `/api/v1/games/${gameData._id}`;
	const handler = (res) => {
		if (res.status === 'success') {
			startModal.hide();
			showMessage(`info`, 'Settings saved.');
			sh.setState((p) => {
				return {
					...p,
					startSettings: settings,
				};
			});

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
	const state = getState();
	if (!state) return;
	if (
		settingsForm.querySelector(`input[name="start-on"]:checked`) &&
		(state.division !== 'Mixed' ||
			((state.genderRule !== 'B' ||
				settingsForm.querySelector(`input[name="gender-b-choice"]:checked`)) &&
				settingsForm.querySelector(`input[name="start-gender"]:checked`))) &&
		settingsForm.querySelector(`input[name="start-direction"]:checked`)
	) {
		submitSettings.disabled = false;
	} else submitSettings.disabled = true;
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
	const state = getState();
	if (!state) return;
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

	if (lc !== state.format.players) lineWarning.classList.remove('d-none');
	else lineWarning.classList.add('d-none');

	if (lc <= state.format.players) startPoint.disabled = false;
	else startPoint.disabled = true;

	//make sure the gender ratio isn't violated - if it is, the line can still be played, but a warning will be displayed next to the start point button.
	const maxes = genderRatioIndicator.dataset;
	if (state.genderRule !== 'A') {
		genderWarning.classList.add('d-none');
		return;
	} else if (
		lineContainer.querySelectorAll('.roster-option[data-gender="M"]').length >
			parseInt(maxes.m) ||
		lineContainer.querySelectorAll('.roster-option[data-gender="F"]').length >
			parseInt(maxes.f)
	)
		genderWarning.classList.remove('d-none');
	else genderWarning.classList.add('d-none');
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
		gameData.format.players > 0 &&
		boxes.length > gameData.format.players - count
	)
		return showMessage('error', 'You have selected too many players.');

	boxes.forEach((b) => {
		const op = b.closest('.roster-option');
		moveOption(op);
	});
	updateCounts();
};

const handleMoveOne = (e) => {
	const state = getState();
	if (!state) return;

	const op = e.target.closest('.roster-option');
	if (!op) return;

	const count = lineContainer.querySelectorAll('.roster-option').length;
	if (
		e.target.closest('.player-container').classList.contains('left-side') &&
		state.format.players > 0 &&
		count >= state.format.players
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
	const state = getState();
	if (!state) return;

	if (e.target !== lineSelect && e.target !== lineReset) return;

	//if the user chooses the "manual" line, do nothing.
	if (e.target === lineSelect && !lineSelect.value) return;

	//clear the existing line
	handleClearLine({ target: clearLine });
	updateCounts();
	//find the selected line, and if there isn't one, return.
	const line = state.lines.find((l) => {
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

	const str = `/api/v1/games/startPoint/${gameData._id}`;
	const body = {
		offense:
			document.querySelector('input[type="radio"][name="od"]:checked')
				?.value === 'true',
		direction: parseInt(
			document.querySelector(
				'input[type="radio"][name="attack-direction"]:checked'
			)?.value
		),
		lineup: getElementArray(lineContainer, `.roster-option`).map(getIds),
	};

	const handler = (res) => {
		if (res.status === 'success') {
			pointModal.hide();
			const evt = new CustomEvent('load-point', {
				detail: {
					...gameData,
					...res.data,
					tournament: {
						roster: gameData.roster,
					},
					currentPoint: res.data.points.slice(-1).pop(),
				},
			});

			document.dispatchEvent(evt);
			showDiv(actionArea);
		}
	};

	handleRequest(str, 'PATCH', body, handler);
};

const handleNewPoint = (e) => {
	showDiv(pointSetup);
	console.log(e.detail);
	sh.setState(e.detail.state);

	let newDirection, newOD;
	if (gameData.currentPoint.endPeriod) {
		if (gameData.currentPoint.period % 2 === 1) {
			newDirection = gameData.startSettings.direction;
			newOD = gameData.startSettings.offense;
		} else {
			newDirection = -gameData.startSettings.direction;

			newOD = !gameData.startSettings.offense;
		}
	} else {
		newDirection = -gameData.currentPoint.direction;
		newOD = gameData.currentPoint.scored === -1;
	}

	const thisPoint = gameData.score + gameData.oppScore + 1;

	let genderRatio = '';
	if (gameData.division === 'Mixed') {
		if (gameData.genderRule === 'A') {
			let m, f;
			if (thisPoint % 4 === 2 || thisPoint % 4 === 3) {
				if (gameData.startSettings.genderRatio === 'f') {
					[m, f] = [
						gameData.format.genderMax[0],
						gameData.format.players - gameData.format.genderMax[0],
					];
				} else {
					[m, f] = [
						gameData.format.players - gameData.format.genderMax[1],
						gameData.format.genderMax[1],
					];
				}
			} else {
				if (gameData.startSettings.genderRatio === 'm') {
					[m, f] = [
						gameData.format.genderMax[0],
						gameData.format.players - gameData.format.genderMax[0],
					];
				} else {
					[m, f] = [
						gameData.format.players - gameData.format.genderMax[1],
						gameData.format.genderMax[1],
					];
				}
			}
			console.log(m, f);
			setGenderRatio(m, f);
		} else if (gameData.genderRule === 'B') {
			let pointsSincePeriodEnd = 0;
			for (var i = gameData.points.length - 1; i >= 0; i--) {
				if (gameData.points[i].endPeriod) break;
				pointsSincePeriodEnd++;
			}
			if (pointsSincePeriodEnd % 2 === 0)
				genderRatio = `${
					gameData.startSettings.genderRatioChoice ? 'You' : 'They'
				} choose`;
			else
				genderRatio = `${
					gameData.startSettings.genderRatioChoice ? 'They' : 'You'
				} choose`;
			genderRatioIndicator.innerHTML = genderRatio;
		} else if (gameData.genderRule === 'X') {
			genderRatio = `${newOD ? 'You' : 'They'} choose`;
			genderRatioIndicator.innerHTML = genderRatio;
		}
	}

	populateForm(pointSetupForm, {
		offense: newOD,
		direction: newDirection,
	});
	console.log(gameData);
};

const setPeriod = (p) => {
	const pd = document.querySelector('.game-period');
	if (pd) {
		if (p === 1) pd.innerHTML = '1st';
		else if (p === 2) pd.innerHTML = '2nd';
		else if (p === 3) pd.innerHTML = '3rd';
		else if (p === 4) pd.innerHTML = '4th';
		else pd.innerHTML = p;
	}
};

let tap = {
	target: undefined,
	timeout: undefined,
};
const clearTap = () => {
	tap.target = undefined;
	clearTimeout(tap.timeout);
	tap.timeout = undefined;
};
const handleDoubleTap = (e) => {
	if (!e.target || e.target.tagName.toLowerCase() === 'label' || !isMobile)
		return;
	let dblTapEvent = new CustomEvent('dbltap');
	//if the target still exists and it's the same as the last touch, dispatch the dbltap event
	const op = e.target.closest('.roster-option');
	if (!op) {
		clearTap();
		return;
	}
	if (tap.target === op) {
		op.dispatchEvent(dblTapEvent);
		tap.target = undefined;
		clearTimeout(tap.timeout);
	}
	//otherwise, set the target to the thing we just touched
	else {
		tap.target = op;
		clearTimeout(tap.timeout);
		tap.timeout = setTimeout(() => {
			tap.target = undefined;
		}, dblTouchTime);
	}
};

const updateStartSettings = (e) => {
	populateForm(settingsForm, e.detail.startSettings);
	validateSettings();
};

const updateScoreboard = (e) => {
	const data = e.detail;
	const us = e.target.querySelector('#us');
	const them = e.target.querySelector('#them');
	us.querySelector('.team-score').innerHTML = data.score;
	them.querySelector('.team-score').innerHTML = data.oppScore;

	e.target.querySelector('.game-period').innerHTML =
		data.period === 0
			? 'Pre'
			: data.period === 1
			? '1st'
			: data.period === 2
			? '2nd'
			: data.period === 3
			? '3rd'
			: data.period === 4
			? '4th'
			: '';

	for (var i = 0; i < 2; i++) {
		if (i >= data.timeoutsLeft[0]) {
			const t = us.querySelector('.timeout-marker:not(.used-timeout)');
			if (t) t.classList.add('used-timeout');
		}
		if (i >= data.timeoutsLeft[1]) {
			const t = them.querySelector('.timeout-marker:not(.used-timeout)');
			if (t) t.classList.add('used-timeout');
		}
	}
};

const updateSetupScoreboard = (e) => {
	const data = e.detail;
	const ourScore = document.querySelector('#our-score-modal');
	const theirScore = document.querySelector('#their-score-modal');
	ourScore.innerHTML = data.score;
	theirScore.innerHTML = data.oppScore;
};

const updatePointSetup = (e) => {
	const data = e.detail;
	const settings = data.startSettings;
	const currentPoint =
		data.points.length === 0 ? undefined : data.points.slice(-1).pop();
	//no point has been played
	let d, o, g;
	//no point has been played
	if (!currentPoint) [d, o] = [settings.direction, settings.offense];
	else if (currentPoint.endPeriod && currentPoint.scored !== 0) {
		//the last point ended a period
		if (currentPoint.period % 2 === 1) {
			//if we just ended an odd period, switch the settings from the start
			d = -settings.direction;
			o = !settings.offense;
		} else {
			//otherwise, use the same settings as the start
			d = settings.direction;
			o = settings.offense;
		}
	} else {
		//the last point did not end the period.
		d = -currentPoint.direction;
		o = currentPoint.scored === -1;
	}
	if (data.division === 'Mixed') {
		if (data.genderRule === 'A') {
			if (!currentPoint) g = settings.genderRatio;
			else if ((currentPoint.score + currentPoint.oppScore) % 4 <= 1) {
				g = settings.genderRatio === 'm' ? 'f' : 'm';
			} else {
				g = settings.genderRatio;
			}
		} else if (gameData.genderRule === 'B') {
			//who got the first choice? (true = us, false = them)
			const firstChoice = settings.genderRatioChoice;
			//how many points have been played this period?
			let pp = 0;
			for (var j = data.points.length - 1; j >= 0; j--) {
				if (data.points[j].endPeriod) break;
				pp++;
			}
			g = firstChoice && pp % 2 === 0 ? 'You' : 'They';
		} else if (data.genderRule === 'X') {
			g = o ? 'You' : 'They';
		}
	}
	populatePointStart(d, o, g);
};

const updateEndPeriodButton = (e) => {
	e.target.disabled =
		e.detail.period >= e.detail.format.periods || e.detail.points.length === 0;
};

document.addEventListener('DOMContentLoaded', () => {
	gameData = JSON.parse(
		document.querySelector('#test-data').getAttribute('data-value')
	);
	if (!gameData._id) {
		showMessage(`error`, `Game Id not valid`);
		setTimeout(() => {
			location.href = '/mystuff';
		}, 1000);
	}

	gameData.roster.forEach((p) => {
		const op = createRosterOption(p, handleArrows);
		op.addEventListener('dblclick', handleMoveOne);
		op.addEventListener('click', handleDoubleTap);
		op.addEventListener('dbltap', handleMoveOne);
		insertOption(op, availableContainer);
	});

	gameData.lines
		.sort((a, b) => {
			return a.name.localeCompare(b.name);
		})
		.forEach((l) => {
			const op = createElement('option');
			op.setAttribute('value', l.id);
			op.innerHTML = l.name;
			lineSelect.appendChild(op);
		});

	lineSelect.addEventListener('change', loadLine);
	lineReset.addEventListener('click', loadLine);

	// populateForm(settingsForm, gameData.startSettings);

	gameData.currentPoint =
		gameData.points.length === 0 ? undefined : gameData.points.slice(-1).pop();

	// if (gameData.currentPoint) {
	// 	if (ourScoreboard) ourScoreboard.innerHTML = gameData.score;
	// 	if (theirScoreboard) theirScoreboard.innerHTML = gameData.oppScore;
	// 	if (ourScore) ourScore.innerHTML = gameData.score;
	// 	if (theirScore) theirScore.innerHTML = gameData.oppScore;
	// }
	//set the timeout situation
	const tol = Math.floor((gameData.timeouts + 1) / 2);
	gameData.timeoutsLeft = [tol, tol];
	// points played
	const pts = getElementArray(document, `#point-data > .point`);
	pts.forEach((p) => {
		const q = p.dataset;
		const tos = getElementArray(p, '.timeout');
		tos.forEach((to) => {
			if (to.getAttribute('data-team') === '1')
				gameData.timeoutsLeft[0] = Math.max(0, gameData.timeoutsLeft[0] - 1);
			else if (to.getAttribute('data-team') === '-1')
				gameData.timeoutsLeft[1] = Math.max(0, gameData.timeoutsLeft[1] - 1);
		});
		//end of the period and the period is the one right before halftime
		//(meaning we're at halftime in this iteration through points...reset the timeouts)
		if (
			q.endPeriod === 'true' &&
			parseInt(q.period) === Math.floor(gameData.format.periods / 2)
		) {
			gameData.timeoutsLeft = gameData.timeoutsLeft.map((t) => {
				if (gameData.timeouts === 4) return 2;
				else if (gameData.timeouts === 3)
					return Math.max(0, Math.min(2, t + 1));
				else if (gameData.timeouts === 2) return 1;
				else if (gameData.timeouts === 1) return Math.max(0, Math.min(1, t));
				else if (gameData.timeouts === 0) return 0;
			});
		}
	});

	//remove the temporary data area
	// dataArea.remove();
	showMessage(
		`info`,
		`Entering game ${gameData.team} vs. ${gameData.opponent}`
	);

	sh = new StateHandler(gameData);

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
	const state = sh.getState();
	if (
		//whether we start on offense
		!state.startSettings.offense === undefined ||
		//mixed division AND (no gender ratio OR starting GR choice not defined with rule B in place)
		((!state.startSettings.genderRatio ||
			(state.startSettings.genderRatioChoice === undefined &&
				state.genderRule === 'B')) &&
			state.division === 'Mixed') ||
		//no valid start direction defined
		(state.startSettings.direction !== -1 &&
			state.startSettings.direction !== 1)
	) {
		startModal.show();
	}

	if (state.currentPoint && state.currentPoint.scored === 0) {
		//there is a point still going on - load it and send the data to point.js
		const evt = new CustomEvent('load-point', {
			detail: {
				...state,
				tournament: {
					roster: state.roster,
				},
			},
		});
		document.dispatchEvent(evt);
		showDiv(actionArea);
	}
	//there is not a point going on - we at the start of the game.
	else if (
		!gameData.currentPoint &&
		gameData.score === 0 &&
		gameData.oppScore === 0
	) {
		//no point has been played - use the start settings and show the point setup div
		populatePointStart(
			gameData.startSettings.direction,
			gameData.startSettings.offense,
			gameData.startSettings.genderRatio
		);
		showDiv(pointSetup);
	} else {
		//at least one point has been played, but we are betweeen points - populate the point start, and show the point setup div
		//		currentPoint exists, but gameData.currentPoint.scored !== 0 (else we would've hit the first block)

		let dir, off, gen;
		//which direction are we going in?
		dir = gameData.currentPoint.endPeriod
			? //if we just ended a period, see if the new period is odd or even
			  //odd - same as starting direction
			  //even - opposite as starting direction
			  (gameData.currentPoint.period + 1) % 2 === 1
				? gameData.startSettings.direction
				: -gameData.startSettings.direction
			: //we didn't just end the period - we're reversing from the last point
			  -gameData.currentPoint.direction;

		//are we on offense or defense?
		off = gameData.currentPoint.endPeriod
			? //if we just ended a period, see if the new period is odd or even
			  //odd - same as how we started
			  //even - opposite how we started
			  (gameData.currentPoint.period + 1) % 2 === 1
				? gameData.startSettings.offense
				: !gameData.startSettings.offense
			: //didn't just end the period - if we got scored on, then we're back on offense.
			  gameData.currentPoint.scored === -1;

		//what's the gender ratio? (only set it if we're mixed division, otherwise, it doesn't matter)
		if (gameData.division === 'Mixed') {
			//gender rule A - suppose the coming point is the Nth point of the game. If N (mod 4) === 0 or 1, use the same ratio as starting
			//if N(mod 4) === 2 or 3, use the opposite
			if (gameData.genderRule === 'A') {
				switch (gameData.score + gameData.oppScore + 1) {
					case 0:
					case 1:
						gen = gameData.startSettings.genderRatio;
						break;
					default:
						gen = gameData.startSettings.genderRatio === 'm' ? 'f' : 'm';
				}
			}
			//gender rule B - the team in the designated endzone chooses.
			//We can't base it on direction alone because the statkeeper might be moving around the field
			//Thus, we have to see how many points have been played in this period. The same team dictates to start each period.
			else if (gameData.genderRule === 'B') {
				//who got the first choice? (true = us, false = them)
				const firstChoice = gameData.startSettings.genderRatioChoice;
				//how many points have been played this period?
				let pp = 0;
				for (var j = gameData.points.length - 1; j >= 0; j--) {
					if (gameData.points[j].endPeriod) break;
					pp++;
				}
				gen =
					(firstChoice && pp % 2 === 0) || (!firstChoice && pp % 2 === 1)
						? 'You'
						: 'They';
			} else if (gameData.genderRule === 'X') {
				gen = off ? 'You' : 'They';
			}
		}

		populatePointStart(dir, off, gen);
		/**
		 * If there has not been a point played, or if the last point played has ended, but we haven't started a new one, show the point start view
		 */
		showDiv(pointSetup);
	}

	settingsForm.addEventListener('change', validateSettings);
	settingsForm.addEventListener('submit', handleSaveSettings);
	cancelSaveSettings.addEventListener('click', restoreSettings);

	moveToLine.addEventListener('click', handleMoveOptions);
	clearLine.addEventListener('click', handleClearLine);

	const filters = getElementArray(
		document,
		`input[type="checkbox"][data-target][data-toggle]`
	);
	filters.forEach((f) => {
		f.addEventListener('change', handleFilters);
	});

	pointSetupForm.addEventListener('submit', handleStartPoint);

	document.addEventListener('point-ended', handleNewPoint);
	document.addEventListener('return-to-point', (e) => {
		showDiv(actionArea);
		sh.setState(e.detail);
	});

	document.addEventListener(
		'touchstart',
		(e) => {
			isMobile = true;
		},
		{ once: true }
	);

	sh.addWatcher(document.body, (e) => {
		gameData = e.detail;
	});
	sh.addWatcher(settingsForm, updateStartSettings);
	sh.addWatcher(scoreboard, updateScoreboard);
	sh.addWatcher(setupScoreboard, updateSetupScoreboard);
	sh.addWatcher(pointSetupForm, updatePointSetup);
	sh.addWatcher(endPeriod, updateEndPeriodButton);
});
