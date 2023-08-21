import { getElementArray } from './utils/getElementArray.js';
import { showMessage } from './utils/messages.js';
import { StateHandler } from './utils/stateHandler.js';
import { handleRequest } from './utils/requestHandler.js';
import { populateForm } from './utils/populateForm.js';
import { createRosterOption, insertOption } from './utils/rosterOption.js';
import { createElement } from './utils/createElementFromSelector.js';
import { showDiv } from './utils/showDiv.js';

const dblTouchTime = 500;
const pointsOffWarning = 6;

const blankPass = {
	offense: undefined,
	player: '',
	x: undefined,
	y: undefined,
	result: '',
	turnover: false,
	goal: 0,
	event: '',
	eventDesc: {
		team: 0,
		in: '',
		out: '',
	},
};

const startModal = new bootstrap.Modal(
	document.querySelector('#start-settings-modal')
);
const pointModal = new bootstrap.Modal(
	document.querySelector('#point-setup-modal')
);
const endPeriodModal = new bootstrap.Modal(
	document.querySelector('#end-period-modal')
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
const genderRatioDisplay = document.querySelector('#gr-container');
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
const confirmEndPeriod = document.querySelector('#confirm-end-period');
const endGameButton = document.querySelector('#end-game-button');
const confirmEndGame = document.querySelector('#confirm-end-game');
//between point timeouts
const ourTimeout = document.querySelector('#timeout-us');
const theirTimeout = document.querySelector('#timeout-them');

//controls
// const undo = document.querySelector('#undo');
// const redo = document.querySelector('#redo');

const actionArea = document.querySelector('#action-div');

let isMobile = false;
//game/tournament data

let sh;
const getState = () => {
	return sh ? sh.getState() : undefined;
};

const getIds = (o) => {
	return o.getAttribute('data-id');
};

const setGenderRatio = (m, f) => {
	const state = getState();
	if (!state) return;

	if (state.genderRule !== 'A') return;

	if (state.currentPoint && !state.currentPoint.genderRatio) {
		sh.setState({
			...state,
			currentPoint: {
				...state.currentPoint,
				genderRatio: {
					m,
					f,
				},
			},
		});
	}

	genderRatioDisplay.innerHTML = `${m}M / ${f}F`;
	genderRatioDisplay.setAttribute(
		'data-majority',
		m > f ? 'M' : f > m ? 'F' : ''
	);
	genderRatioIndicator.setAttribute('data-m', m);
	genderRatioIndicator.setAttribute('data-f', f);
};

const populatePointStart = (dir, off, gen) => {
	const state = sh.getState();
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
	const startSettings = sh?.getState()?.startSettings;
	if (startSettings) populateForm(settingsForm, startSettings);
};

const handleSaveSettings = (e) => {
	e.preventDefault();

	if (e.target !== settingsForm) return;
	const state = sh.getState();
	if (!state) return;

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
			state.genderRule === 'B'
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

	const str = `/api/v1/games/${state._id}`;
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

	if (state.division.toLowerCase() === 'mixed') {
		//make sure the gender ratio isn't violated - if it is, the line can still be played, but a warning will be displayed next to the start point button.
		const maxes = genderRatioIndicator.dataset;
		const evt = new CustomEvent('set-gender-ratio', {
			detail: maxes,
		});
		document.dispatchEvent(evt);
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
	}
};

const handleMoveOptions = (e) => {
	const state = sh?.getState();
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
		state.format.players > 0 &&
		boxes.length > state.format.players - count
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

const handleTimeout = (e) => {
	const state = sh?.getState();
	if (!state) return;

	if (e.target === ourTimeout) {
		if (state.timeoutsLeft[0] <= 0)
			return showMessage('error', 'Your team has no timeouts left.');
		state.timeoutsLeft[0]--;
		sh.setState(state);
	} else if (e.target === theirTimeout) {
		if (state.timeoutsLeft[1] <= 0)
			return showMessage('error', 'Opponent has no timeouts left.');
		state.timeoutsLeft[1]--;
		sh.setState(state);
	} else if (state.result !== '') {
		return showMessage('error', 'The game has ended.');
	}

	//if there is no current point or if the current point was already scored, start a new point and
	//add a timeout to it
	if (!state.currentPoint || state.currentPoint.scored !== 0) {
		const genderRatio =
			state.genderRule === 'A' ? genderRatioIndicator.dataset : null;
		const body = {
			offense:
				state.points.length === 0
					? state.startSettings.offense
					: state.points.slice(-1).pop().scored === -1,
			direction: parseInt(
				document.querySelector(
					'input[type="radio"][name="attack-direction"]:checked'
				)?.value
			),
			lineup: [],
			passes: [
				{
					...blankPass,
					offense:
						document.querySelector('input[type="radio"][name="od"]:checked')
							?.value === 'true',
					event: 'timeout',
					eventDesc: {
						team: e.target === ourTimeout ? 1 : -1,
						in: '',
						out: '',
					},
				},
			],
		};
		handleStartPoint(body, genderRatio || null);
	} else {
		state.currentPoint.passes.push({
			...blankPass,
			event: 'timeout',
			eventDesc: {
				team: e.target === ourTimeout ? 1 : -1,
				in: '',
				out: '',
			},
		});
		sh.setState(state);
		const str = `/api/v1/games/setPasses/${state._id}`;
		const body = state.currentPoint;
		const handler = (res) => {
			if (res.status !== 'success') {
				showMessage(
					'error',
					`Error updating passes in database - ${res.message}`
				);
			}
			return;
		};
		handleRequest(str, 'PATCH', body, handler);
	}
};
//TODO: point setup modal should show start settings for this point if we haven't yet set a lineup.
const handleSetLineup = (e) => {
	e.preventDefault();

	const state = sh?.getState();
	if (!state) return;
	let genderRatio;
	if (state.division.toLowerCase() === 'mixed') {
		genderRatio = genderRatioIndicator.dataset;
		if (genderRatio.m && genderRatio.f) {
			const currentGR = [
				getElementArray(lineContainer, `.roster-option[data-gender="M"]`)
					.length,
				getElementArray(lineContainer, `.roster-option[data-gender="F"]`)
					.length,
			];
			if (currentGR[0] > genderRatio.m || currentGR[1] > genderRatio.f) {
				showMessage(
					'warning',
					`This lineup's gender ratio (${currentGR[0]}M/${currentGR[1]}F) violates the prescribed ratio.`
				);
			}
		}
	}
	//no points started, or the current point has been scored, so we're starting a new point
	if (!state.currentPoint || state.currentPoint.scored !== 0) {
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
			passes: [],
		};
		handleStartPoint(body, genderRatio || null);
	} else {
		const str = `/api/v1/games/setLineup/${state._id}`;
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
				const currentPoint = res.data.points.slice(-1).pop();
				const detail = {
					...state,
					...res.data,
					tournament: {
						roster: state.roster,
					},
					currentPoint: {
						...currentPoint,
						genderRatio: {
							m: genderRatio.m,
							f: genderRatio.f,
						},
					},
				};
				if (currentPoint.lineup && currentPoint.lineup.length > 0) {
					const evt = new CustomEvent('load-point', {
						detail,
					});

					document.dispatchEvent(evt);
					showDiv(actionArea);
				}
			}
		};
		handleRequest(str, 'PATCH', body, handler);
	}
};

const getGenderRatio = () => {
	let toReturn = [0, 0];

	const state = sh.getState();
	if (!state) return toReturn;

	const lineup = state.currentPoint?.lineup;
	if (!lineup) return toReturn;

	lineup.forEach((p) => {
		const pl = state.roster.find((e) => {
			return e.id === p;
		});
		if (!pl) return;
		else if (pl.gender === 'M') toReturn[0]++;
		else if (pl.gender === 'F') toReturn[1]++;
	});

	return toReturn;
};

const handleStartPoint = (body, genderRatio) => {
	const state = sh?.getState();
	if (!state) return;

	const str = `/api/v1/games/startPoint/${state._id}`;
	const handler = (res) => {
		if (res.status === 'success') {
			pointModal.hide();
			if (res.data.points?.length > 0) {
				const currentPoint = res.data.points.slice(-1).pop();

				const detail = {
					...state,
					...res.data,
					tournament: {
						roster: state.roster,
					},
					currentPoint: {
						...currentPoint,
						genderRatio: {
							m: genderRatio ? genderRatio.m : 0,
							f: genderRatio ? genderRatio.f : 0,
						},
					},
				};
				sh.setState({
					...state,
					...res.data,
					currentPoint: {
						...currentPoint,
						genderRatio: {
							m: genderRatio ? genderRatio.m : 0,
							f: genderRatio ? genderRatio.f : 0,
						},
					},
				});

				const evt = new CustomEvent('load-point', {
					detail,
				});

				document.dispatchEvent(evt);
				if (currentPoint.lineup && currentPoint.lineup.length > 0) {
					showDiv(actionArea);
				}
			}
		} else {
			showMessage('error', res.message);
		}
	};

	handleRequest(str, 'PATCH', body, handler);
};

const handleNewPoint = (e) => {
	showDiv(pointSetup);
	sh.setState(e.detail);
	const state = sh.getState();
	if (!state) return;

	let newDirection, newOD;
	if (!state.currentPoint) {
		newDirection = state.startSettings.direction;
		newOD = state.startSettings.offense;
	} else if (state.currentPoint.endPeriod) {
		if (state.currentPoint.period % 2 === 0) {
			newDirection = state.startSettings.direction;
			newOD = state.startSettings.offense;
		} else {
			newDirection = -state.startSettings.direction;
			newOD = !state.startSettings.offense;
		}
	} else {
		newDirection = -state.currentPoint.direction;
		newOD = state.currentPoint.scored === -1;
	}

	const thisPoint = state.score + state.oppScore + 1;

	let genderRatio = '';
	if (state.division === 'Mixed') {
		if (state.genderRule === 'A') {
			let m, f;
			if (thisPoint % 4 === 2 || thisPoint % 4 === 3) {
				if (state.startSettings.genderRatio === 'f') {
					[m, f] = [
						state.format.genderMax[0],
						state.format.players - state.format.genderMax[0],
					];
				} else {
					[m, f] = [
						state.format.players - state.format.genderMax[1],
						state.format.genderMax[1],
					];
				}
			} else {
				if (state.startSettings.genderRatio === 'm') {
					[m, f] = [
						state.format.genderMax[0],
						state.format.players - state.format.genderMax[0],
					];
				} else {
					[m, f] = [
						state.format.players - state.format.genderMax[1],
						state.format.genderMax[1],
					];
				}
			}
			setGenderRatio(m, f);
		} else if (state.genderRule === 'B') {
			let pointsSincePeriodEnd = 0;
			for (var i = state.points.length - 1; i >= 0; i--) {
				if (state.points[i].endPeriod) break;
				pointsSincePeriodEnd++;
			}
			if (pointsSincePeriodEnd % 2 === 0)
				genderRatio = `${
					state.startSettings.genderRatioChoice ? 'You' : 'They'
				} choose`;
			else
				genderRatio = `${
					state.startSettings.genderRatioChoice ? 'They' : 'You'
				} choose`;
			genderRatioIndicator.innerHTML = genderRatio;
		} else if (state.genderRule === 'X') {
			genderRatio = `${newOD ? 'You' : 'They'} choose`;
			genderRatioIndicator.innerHTML = genderRatio;
		}
	}

	populateForm(pointSetupForm, {
		offense: newOD,
		direction: newDirection,
	});
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
	if (!e.detail || !e.detail.startSettings) return;
	populateForm(settingsForm, e.detail.startSettings);
	validateSettings();
};

const updateScoreboard = (e) => {
	const data = e.detail;
	if (!data) return;
	const us = e.target.querySelector('#us');
	const them = e.target.querySelector('#them');
	us.querySelector('.team-score').innerHTML = data.score;
	them.querySelector('.team-score').innerHTML = data.oppScore;

	e.target.querySelector('.game-period').innerHTML =
		data.result !== ''
			? 'Final'
			: data.period === 0
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

	getElementArray(document, '.used-timeout').forEach((el) => {
		el.classList.remove('used-timeout');
	});

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
	if (!data) return;
	const ourScore = document.querySelector('#our-score-modal');
	const theirScore = document.querySelector('#their-score-modal');
	ourScore.innerHTML = data.score;
	theirScore.innerHTML = data.oppScore;
};

//TODO: logic for if lineup hasn't been set, we should populate the settings for the start of this point (not the start of next point)
const updatePointSetup = (e) => {
	const data = e.detail;
	if (!data) return;
	const settings = data.startSettings;
	let currentPoint =
		data.points.length === 0 ? undefined : data.points.slice(-1).pop();
	//if we haven't set the lineup for this point (and thus disappeared the point setup area), use the previous point for calculating
	//point settings (e.g. gender ratio, direction, pull/receive)
	if (currentPoint && currentPoint.lineup.length === 0) {
		currentPoint =
			data.points.length === 1 ? undefined : data.points.slice(-2)[0];
	}
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
		} else if (data.genderRule === 'B') {
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
	if (!e.detail) return;
	e.target.disabled =
		e.detail.period >= e.detail.format.periods || e.detail.points.length === 0;
};

const handleEndPeriod = (e) => {
	const state = sh.getState();
	const str = `/api/v1/games/endPeriod/${state._id}`;
	const handler = (res) => {
		if (res.status !== 'success') {
			showMessage('error', res.message);
		} else {
			let pdName;
			if (state.format.periods === 4) pdName = 'quarter';
			else if (state.format.periods === 2) pdName = 'half';
			else pdName = 'period';

			let pdNo;
			if (res.data.period === 2) pdNo = '1st';
			else if (res.data.period === 3) pdNo = '2nd';
			else if (res.data.period === 4) pdNo = '3rd';
			showMessage('info', `End of ${pdNo} ${pdName}`, 2000);
			endPeriodModal.hide();
			sh.setState({
				...state,
				...res.data,
			});
		}
	};
	handleRequest(str, 'PATCH', null, handler);
};

const handlePointsPlayed = (e) => {
	const lbl = e.target.querySelector('.points-off');
	const state = e.detail;
	const id = e.target.getAttribute('data-id');

	let pointsOff = 0;

	for (var i = state.points.length - 1; i >= 0; i--) {
		const point = state.points[i];
		if (point.lineup.includes(id) || point.injuries.includes(id)) break;
		else if (point.scored !== 0) pointsOff++;
	}

	if (pointsOff >= pointsOffWarning) {
		lbl.innerHTML = pointsOff;
		lbl.classList.remove('invisible');
	} else {
		lbl.innerHTML = '';
		lbl.classList.add('invisible');
	}

	let pp = 0;
	e.detail.points.forEach((p) => {
		if (p.lineup.includes(id) || p.injuries.includes(id)) pp++;
	});
	const ppLabel = e.target.querySelector('.points-played');
	if (ppLabel) ppLabel.innerHTML = pp;
};

const handleTimeoutButtons = (state) => {
	ourTimeout.disabled = state.result !== '';
	theirTimeout.disabled = state.result !== '';
};

const handleEndGameButton = (e) => {
	if (e.detail.result !== '') {
		e.target.innerHTML = 'Exit game';
	} else {
		e.target.innerHTML = 'End game';
	}
};

const handleEndGame = (e) => {
	const state = sh.getState();

	if (state.result === '') {
		const str = `/api/v1/games/endGame/${state._id}`;
		const handler = (res) => {
			if (res.status === 'success') {
				showMessage('info', 'Game ended.');
				setTimeout(() => {
					location.href = '/mystuff';
				}, 1000);
			}
		};
		handleRequest(str, 'PATCH', null, handler);
	} else {
		location.href = '/mystuff';
	}
};

document.addEventListener('DOMContentLoaded', () => {
	const dataArea = document.querySelector('#data-area');
	let state = JSON.parse(
		dataArea.querySelector('#game-data').getAttribute('data-value')
	);
	if (!state._id) {
		showMessage(`error`, `Game Id not valid`);
		setTimeout(() => {
			location.href = '/mystuff';
		}, 1000);
	}

	state.lines
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

	state.currentPoint =
		state.points.length === 0 ? undefined : state.points.slice(-1).pop();

	//set the timeout situation
	const tol = Math.floor((state.timeouts + 1) / 2);
	state.timeoutsLeft = [tol, tol];
	// points played
	const pts = getElementArray(document, `#point-data > .point`);
	pts.forEach((p) => {
		const q = p.dataset;
		const tos = getElementArray(p, '.timeout');
		tos.forEach((to) => {
			if (to.getAttribute('data-team') === '1')
				state.timeoutsLeft[0] = Math.max(0, state.timeoutsLeft[0] - 1);
			else if (to.getAttribute('data-team') === '-1')
				state.timeoutsLeft[1] = Math.max(0, state.timeoutsLeft[1] - 1);
		});
		//end of the period and the period is the one right before halftime
		//(meaning we're at halftime in this iteration through points...reset the timeouts)
		if (
			q.endPeriod === 'true' &&
			parseInt(q.period) === Math.floor(state.format.periods / 2)
		) {
			state.timeoutsLeft = state.timeoutsLeft.map((t) => {
				if (state.timeouts === 4) return 2;
				else if (state.timeouts === 3) return Math.max(0, Math.min(2, t + 1));
				else if (state.timeouts === 2) return 1;
				else if (state.timeouts === 1) return Math.max(0, Math.min(1, t));
				else if (state.timeouts === 0) return 0;
			});
		}
	});

	//remove the temporary data area
	dataArea.remove();
	showMessage(`info`, `Entering game ${state.team} vs. ${state.opponent}`);

	sh = new StateHandler(state);

	state.roster.forEach((p) => {
		const pointsPlayed = state.points.reduce((prev, c) => {
			if (c.lineup.includes(p.id) || c.injuries.includes(p.id)) return prev + 1;
			return prev;
		}, 0);
		const op = createRosterOption({ ...p, pointsPlayed }, handleArrows);
		op.addEventListener('dblclick', handleMoveOne);
		op.addEventListener('click', handleDoubleTap);
		op.addEventListener('dbltap', handleMoveOne);
		insertOption(op, availableContainer);
		sh.addWatcher(op, handlePointsPlayed);
	});
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
	state = sh.getState();

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

	if (
		state.currentPoint &&
		state.currentPoint.scored === 0 &&
		state.currentPoint.lineup?.length > 0
	) {
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
	else if (!state.currentPoint && state.score === 0 && state.oppScore === 0) {
		//no point has been played - use the start settings and show the point setup div
		populatePointStart(
			state.startSettings.direction,
			state.startSettings.offense,
			state.startSettings.genderRatio
		);
		const evt = new CustomEvent('load-point', {
			detail: {
				...state,
				tournament: {
					roster: state.roster,
				},
			},
		});
		document.dispatchEvent(evt);
		showDiv(pointSetup);
	} else {
		//at least one point has been played, but we are betweeen points - populate the point start, and show the point setup div
		//		currentPoint exists, but state.currentPoint.scored !== 0 (else we would've hit the first block)

		let dir, off, gen;
		//which direction are we going in?
		dir = state.currentPoint.endPeriod
			? //if we just ended a period, see if the new period is odd or even
			  //odd - same as starting direction
			  //even - opposite as starting direction
			  (state.currentPoint.period + 1) % 2 === 1
				? state.startSettings.direction
				: -state.startSettings.direction
			: //we didn't just end the period - we're reversing from the last point
			  -state.currentPoint.direction;

		//are we on offense or defense?
		off = state.currentPoint.endPeriod
			? //if we just ended a period, see if the new period is odd or even
			  //odd - same as how we started
			  //even - opposite how we started
			  (state.currentPoint.period + 1) % 2 === 1
				? state.startSettings.offense
				: !state.startSettings.offense
			: //didn't just end the period - if we got scored on, then we're back on offense.
			  state.currentPoint.scored === -1;

		//what's the gender ratio? (only set it if we're mixed division, otherwise, it doesn't matter)
		if (state.division === 'Mixed') {
			//gender rule A - suppose the coming point is the Nth point of the game. If N (mod 4) === 0 or 1, use the same ratio as starting
			//if N(mod 4) === 2 or 3, use the opposite
			if (state.genderRule === 'A') {
				switch (state.score + state.oppScore + 1) {
					case 0:
					case 1:
						gen = state.startSettings.genderRatio;
						break;
					default:
						gen = state.startSettings.genderRatio === 'm' ? 'f' : 'm';
				}
			}
			//gender rule B - the team in the designated endzone chooses.
			//We can't base it on direction alone because the statkeeper might be moving around the field
			//Thus, we have to see how many points have been played in this period. The same team dictates to start each period.
			else if (state.genderRule === 'B') {
				//who got the first choice? (true = us, false = them)
				const firstChoice = state.startSettings.genderRatioChoice;
				//how many points have been played this period?
				let pp = 0;
				for (var j = state.points.length - 1; j >= 0; j--) {
					if (state.points[j].endPeriod) break;
					pp++;
				}
				gen =
					(firstChoice && pp % 2 === 0) || (!firstChoice && pp % 2 === 1)
						? 'You'
						: 'They';
			} else if (state.genderRule === 'X') {
				gen = off ? 'You' : 'They';
			}
		}

		populatePointStart(dir, off, gen);
		const evt = new CustomEvent('load-point', {
			detail: {
				...state,
				tournament: {
					roster: state.roster,
				},
			},
		});
		document.dispatchEvent(evt);

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

	ourTimeout.addEventListener('click', handleTimeout);
	theirTimeout.addEventListener('click', handleTimeout);
	pointSetupForm.addEventListener('submit', handleSetLineup);

	confirmEndPeriod.addEventListener('click', handleEndPeriod);
	confirmEndGame.addEventListener('click', handleEndGame);
	document.addEventListener('update-info', (e) => {
		if (sh) sh.setState(e.detail);
	});
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

	sh.addWatcher(settingsForm, updateStartSettings);
	sh.addWatcher(scoreboard, updateScoreboard);
	sh.addWatcher(setupScoreboard, updateSetupScoreboard);
	sh.addWatcher(pointSetupForm, updatePointSetup);
	sh.addWatcher(endPeriod, updateEndPeriodButton);
	sh.addWatcher(null, handleTimeoutButtons);
	sh.addWatcher(endGameButton, handleEndGameButton);
});
