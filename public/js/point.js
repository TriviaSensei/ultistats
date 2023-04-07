import { showMessage } from './utils/messages.js';
import { handleRequest } from './utils/requestHandler.js';
import { createElement } from './utils/createElementFromSelector.js';
import { getElementArray } from './utils/getElementArray.js';
import { showDiv } from './utils/showDiv.js';
import { StateHandler } from './utils/stateHandler.js';
import { propCase } from './utils/propCase.js';

let sh;

const blankPass = {
	thrower: '',
	receiver: '',
	defender: '',
	x0: undefined,
	y0: undefined,
	x1: undefined,
	y1: undefined,
	result: '',
	turnover: false,
	event: '',
	eventDesc: {
		team: 0,
		in: '',
		out: '',
	},
	goal: 0,
};

let isMobile = false;

const teamDirection = document.querySelector('#team-direction');
const oppDirection = document.querySelector('#opp-direction');

const us = document.querySelector('#us');
const ourScore = us.querySelector('.team-score');
const ourTOs = us.querySelector('.team-timeouts');

const them = document.querySelector('#them');
const theirScore = them.querySelector('.team-score');
const theirTOs = them.querySelector('.team-timeouts');

const field = document.querySelector('#field-canvas');
const disc = document.querySelector('.disc');
const discLine = document.querySelector('.disc-line');
const undo = document.querySelector('#undo-button');
const redo = document.querySelector('#redo-button');
const lastEvent = document.querySelector('#event-desc');
const buttonRowContainer = document.querySelector('#button-row-container');

const pointTimeout = document.querySelector('#timeout');
const ourTimeout = document.querySelector('#point-timeout-us');
const theirTimeout = document.querySelector('#point-timeout-them');

const actionArea = document.querySelector('#action-div');

const drop = document.querySelector('#drop');
const throwaway = document.querySelector('#throwaway');
const goal = document.querySelector('#goal');

//positioning buttons
const brick = document.querySelector('#brick');
const ownGoal = document.querySelector('#own-goal');
const attackingGoal = document.querySelector('#attack-goal');
const revBrick = document.querySelector('#reverse-brick');
const midfield = document.querySelector('#midfield');
const centerDisc = document.querySelector('#center');

let moving = false;

let state;

const getYards = (pageX, pageY) => {
	if (!sh) return [null, null];
	state = sh.getState();
	if (!state.currentPoint || Math.abs(state.currentPoint.direction) !== 1)
		return [0, 0];

	const r = field.getBoundingClientRect();
	let pctX = (pageX - r.left) / r.width;
	let pctY = (pageY - r.top) / r.height;

	if (state.currentPoint.direction === -1) {
		pctX = 1 - pctX;
		pctY = 1 - pctY;
	}

	return [
		pctX * (state.format.length + 2 * state.format.endzone),
		pctY * state.format.width,
	];
};

const getPageCoordinates = (x, y) => {
	if (!sh) return [null, null];
	state = sh.getState();

	const r = field.getBoundingClientRect();
	let pctX = x / (state.format.length + 2 * state.format.endzone);
	let pctY = y / state.format.width;
	if (state.currentPoint.direction === -1) {
		pctX = 1 - pctX;
		pctY = 1 - pctY;
	}

	return [pctX * r.width + r.left, pctY * r.height + r.top];
};

const deselectAll = () => {
	getElementArray(document, 'button[selected]').forEach((b) => {
		b.removeAttribute('selected');
	});
};

const updatePasses = () => {
	if (!sh) return;
	state = sh.getState();
	const str = `/api/v1/games/addPass/${state._id}`;
	const body = state.currentPoint;
	const handler = (res) => {
		if (res.status !== 'success') {
			showMessage(
				'error',
				`Error updating passes in database - ${res.message}`
			);
		} else {
			console.log(`Successfully updated passes`);
			console.log(state.currentPoint.passes);
		}
	};
	handleRequest(str, 'PATCH', body, handler);
};

const handleTimeout = (e) => {};

const showEvent = (msg) => {
	if (Array.isArray(msg)) {
		let str = '';
		msg.forEach((m, i) => {
			if (i !== 0) str = `${str}<br>`;
			str = `${str}${m}`;
		});
		lastEvent.innerHTML = str;
	} else if ((typeof msg).toLowerCase() === 'string') {
		lastEvent.innerHTML = msg;
	}
};
const displayEventDescription = (e) => {
	if (!e.detail) return;
	state = e.detail;
	//get the current point
	const currentPoint = state.currentPoint;
	if (!currentPoint) return showEvent('(No events)');

	//any passes?
	if (currentPoint.passes.length === 0) {
		if (currentPoint.offense)
			return showEvent(`${state.opponent} pulls to ${state.team}`);
		else return showEvent(`${state.team} pulls to ${state.opponent}`);
	}
	//there are some passes or events this point
	else {
		const last = currentPoint.passes.slice(-2)[0];
		let lastPass;
		for (var i = currentPoint.passes.length - 2; i >= 0; i--) {
			if (currentPoint.passes[i].event === '')
				lastPass = currentPoint.passes[i];
			break;
		}

		//events to display - a pass, a goal, etc.
		let events = [];

		if (last.event === 'timeout') {
			const toTeam = last.eventDesc.team === 1 ? state.team : state.opponent;
			events.push(`${toTeam} took a timeout.`);
		} else if (last.event === 'sub') {
			if (last.eventDesc.team === -1)
				events.push(`${state.opponent} took a sub.`);
			else {
				const [playerIn, playerOut] = [
					state.roster.find((p) => {
						return p.id === last.eventDesc.in;
					}),
					state.roster.find((p) => {
						return p.id === last.eventDesc.out;
					}),
				];
				events.push(
					`${playerIn.firstName} came in for ${playerOut.firstName}.`
				);
			}
		}

		//no passes - only the timeout or sub
		if (!lastPass) {
			const [rt, pt] = currentPoint.offense
				? [state.team, state.opponent]
				: [state.opponent, state.team];
			events.push(`${pt} pulls to ${rt}`);
		}

		if (events.length > 0) {
			return showEvent(events);
		} else {
			//there's an actual pass that has happened or is being recorded
			const passes = currentPoint.passes.filter((p) => {
				return p.event === '';
			});
			/**
			 * Events:
			 * Pick up pull (receiver, location)
			 * Complete pass (inc. goal) (receiver, thrower, location, result=goal/complete)
			 * Drop (receiver, thrower, location, result=drop)
			 * Throwaway (thrower, location, result=throwaway)
			 * Stall (thrower, old location, result=stall)
			 * We get a block (defender, location)
			 * They get a block (coded as a throwaway or a drop at discretion of statkeeper)
			 * Yardage penalty (AUDL/observed USAU games only; thrower, location)
			 */

			//TODO: finish the "display event" function, start fixing the move disc/draw pass/push data functions.

			//get the thrower, receiver, or defender
			const thrower = state.roster.find((p) => {
				return lastPass.thrower === p.id;
			})?.firstName;
			const receiver = state.roster.find((p) => {
				return lastPass.receiver === p.id;
			})?.firstName;
			const defender = state.roster.find((p) => {
				return lastPass.defender === p.id;
			})?.firstName;

			if (currentPoint.scored === 1) {
				const scoringPass = currentPoint.passes.slice(-1).pop();
				const scorer = state.roster.find((p) => {
					return scoringPass.receiver === p.id;
				})?.firstName;
				return showEvent(
					`${scorer || 'Unknown'} scored!<br>${state.team} to pull to ${
						state.opponent
					}`
				);
			} else if (currentPoint.scored === -1)
				return showEvent(
					`${state.opponent} scored!<br>${state.opponent} to pull to ${state.team}`
				);

			let place;
			if (!isNaN(lastPass.x1)) place = getPlace(lastPass.x1);

			//if the last pass has a defender, then we just got a block
			if (lastPass.defender) {
				//check if it was a callahan
				if (lastPass.goal === 0) {
					return showEvent(
						`${defender || 'Unknown'} got a block${
							` ${place || ''}.` || '.'
						}<br>${state.team} to pick up the disc.`
					);
				} else if (lastPass.goal === 1)
					return showEvent(`${defender || 'Unknown'} got a Callahan!`);
			}
			//first event of the point
			else if (passes.length === 2) {
				//first play of the point and it wasn't a D - it's someone catching/picking up/dropping the pull.
				if (currentPoint.offense) {
					if (lastPass.result === 'drop')
						return showEvent(
							`${receiver || 'Unknown'} dropped the pull.<br>${
								state.opponent
							} has the disc.`
						);
					//picking up the pull
					return showEvent(
						`${receiver || 'Unknown'} picked up the pull ${place}.`
					);
				} else {
					if (lastPass.result === 'drop')
						return showEvent(
							`${state.opponent} dropped the pull.<br>${state.team} to pick up the disc.`
						);
					else if (lastPass.result === 'throwaway')
						return showEvent(
							`${state.opponent} threw the disc away.<br>${state.team} to pick up the disc.`
						);
					else if (lastPass.result === 'stall')
						return showEvent(
							`${state.opponent} got stalled out.<br>${state.team} to pick up the disc.`
						);
				}
			}
			//this isn't the first pass (this is only to differentiate picking up the pull vs. picking up the disc after getting it on a turn)
			else {
				//thrower and receiver, so there was a pass.
				if (lastPass.thrower && lastPass.receiver) {
					//complete pass
					if (lastPass.result === 'complete' && lastPass.goal === 1) {
						return showEvent(`${receiver || 'Unknown'} scored!`);
					} else if (lastPass.result === 'complete') {
						const dx = Math.round(lastPass.x1 - lastPass.x0);
						if (isNaN(dx)) return;
						return showEvent(
							`${thrower || 'Unknown'} → ${receiver || 'Unknown'} (${
								dx < 0 ? '-' : '+'
							}${dx})`
						);
					}
					//dropped pass
					else if (lastPass.result === 'drop') {
						return showEvent(
							`${receiver || 'Unknown'} dropped the disc.<br>${
								state.opponent
							} has the disc.`
						);
					}
				}
				//receiver only - picking up the disc
				else if (lastPass.receiver) {
					const place = getPlace(last.x1);
					return showEvent(
						`${receiver || 'Unknown'} picked up the disc ${place}`
					);
				}
				//thrower only - could be a stall, a throwaway, or a penalty of some sort (AUDL/observed USAU game)
				else if (lastPass.thrower) {
					if (lastPass.result === 'throwaway') {
						return showEvent(
							`${thrower || 'Unknown'} threw the disc away.<br>${
								state.opponent
							} has the disc.`
						);
					} else if (lastPass.result === 'stall') {
						return showEvent(
							`${thrower || 'Unknown'} got stalled out.<br>${
								state.opponent
							} has the disc.`
						);
					} else if (lastPass.event === 'penalty') {
						return showEvent(
							`Yardage penalty.<br>${thrower || 'Unknown'} has the disc.`
						);
					}
				}
			}
		}
	}
};
const handleEvent = (e) => {
	if (!sh) return;
	state = sh.getState();

	const currentPoint = state.currentPoint;
	const currentPass = currentPoint.passes.slice(-1).pop();

	if (
		currentPoint.possession &&
		!currentPass.receiver &&
		!currentPass.thrower &&
		!e.target.getAttribute('data-event')
	) {
		return showMessage('error', 'You must select a player to possess the disc');
	}

	const eventName = e.target.getAttribute('data-event');
	const updater = {
		turnover: false,
		result: eventName,
	};
	switch (eventName) {
		case 'stall':
		case 'drop':
		case 'throwaway':
			updater.turnover = true;
		case 'goal':
			if (!state.discIn) return showMessage('error', 'The disc is not live.');
			const sel = e.target.parentElement.querySelector('button[selected]');
			if (sel) sel.removeAttribute('selected');
			if (sel === e.target) {
				updateCurrentPass({ result: '' });
				return;
			}
			e.target.setAttribute('selected', '');
			updateCurrentPass(updater);
			break;
		case 'sub':
			break;
		case 'timeout':
			handleTimeout({ target: e.target });
			break;
		default:
			return;
	}
};
const getPlace = (yds) => {
	if (!sh) return null;
	state = sh.getState();
	yds = Math.round(yds - state.format.endzone);
	switch (true) {
		case yds <= -2:
			return `${Math.abs(yds)} yards inside the endzone`;
		case yds === -1:
			return `1 yard inside the endzone`;
		case yds === 0:
			return `on the goal line`;
		case yds < state.format.length / 2:
			return `on the ${yds}-yard line`;
		case yds === state.format.length / 2:
			return `at midfield`;
		case yds < state.format.length:
			return `on the opposing ${state.format.length - yds}-yard line`;
		case yds === state.format.length:
			return `on the opposing goal line`;
		default:
			return `in the opposing endzone`;
	}
};

const drawPass = (p) => {
	if (!p) return;
	if (!sh) return;
	state = sh.getState();

	const [x0, y0] =
		!isNaN(p.x0) && !isNaN(p.y0)
			? getPageCoordinates(p.x0, p.y0)
			: [null, null];
	const [x1, y1] =
		!isNaN(p.x1) && !isNaN(p.y1)
			? getPageCoordinates(p.x1, p.y1)
			: [null, null];
	if ((x1 !== null) & (y1 !== null)) drawDisc(x1, y1);
	else
		drawDisc(
			state.format.length / 2 + state.format.endzone,
			state.format.width / 2
		);

	if (!isNaN(p.x1) && !isNaN(p.y1) && !isNaN(p.x0) && !isNaN(p.y0))
		drawLine(x0, y0, x1, y1);
	else drawLine(null);
};

const undoPass = (e) => {
	state = sh.getState();

	if (e.target !== undo) return;
	const passes = state?.currentPoint?.passes;
	if (!passes || !Array.isArray(passes) || passes.length < 2) return;

	const currentPass = state.currentPoint.passes.pop();
	const lastPass = state.currentPoint.passes.pop();
	const previousPass =
		state.currentPoint.passes.length > 0
			? state.currentPoint.passes.slice(-1).pop()
			: undefined;
	redo.disabled = false;

	//we are not undoing a scoring pass
	if (currentPass.goal === 0) {
		if (lastPass.turnover)
			state.currentPoint.possession = !state.currentPoint.possession;
		state.poppedPasses.push(lastPass);
		if (previousPass?.turnover) {
			state.currentPoint.passes.push({ ...blankPass });
		} else if (previousPass) {
			state.currentPoint.passes.push({
				...blankPass,
				thrower: previousPass.receiver,
				x0: previousPass.x1,
				y0: previousPass.y1,
			});
			drawPass(previousPass);
		} else {
			state.currentPoint.passes.push({
				...blankPass,
				x1: lastPass.x1,
				y1: lastPass.y1,
			});
		}
		deselectAll();
		return sh.setState(state);
	}
	//we are undoing a scoring pass
	else {
		state.currentPoint.passes.push(lastPass);
		if (state.currentPoint.possession) {
			state.currentPoint.passes.push({
				...blankPass,
				thrower: currentPass.thrower,
				x0: currentPass.x1,
				y0: currentPass.y1,
			});
		}
		state.currentPoint = {
			...state.currentPoint,
			endPeriod: false,
			scored: 0,
		};
		if (currentPass.goal === 1) state.score--;
		else if (currentPass.goal === -1) state.oppScore--;

		state.discIn = true;

		drawPass(lastPass);

		sh.setState(state);
		const evt = new CustomEvent('return-to-point', {
			detail: state,
		});
		document.dispatchEvent(evt);
	}
};

const redoPass = (e) => {
	if (e.target !== redo) return;
	state = sh?.getState();
	if (!state || !state.poppedPasses || state.poppedPasses.length === 0) return;
	const toRedo = state.poppedPasses.pop();
	if (!toRedo) return;
	updateCurrentPass(toRedo, { redo: true });
	drawPass(toRedo);
};

//TODO: handle events (drop, goal, etc.)
const updateCurrentPass = (data, ...opts) => {
	if (!sh) return;
	state = sh.getState();

	let clearPoppedPasses = true;
	if (opts.length > 0) {
		if (opts[0].redo) clearPoppedPasses = false;
	}

	const passes = state.currentPoint?.passes;
	if (!passes) return;
	if (passes.length === 0) {
		passes.push({
			...blankPass,
		});
	}
	let currentPass = passes[passes.length - 1];
	let currentPoint = state.currentPoint;
	//if we're updating a location, make sure we're not throwing it from the end zone,
	//and set the last pass ending spot to the goal line, at maximum)
	if (data.x1) {
		if (
			currentPass.x0 &&
			currentPass.x0 > state.format.length + state.format.endzone
		) {
			currentPass.x0 = state.format.length + state.format.endzone;
			if (passes.length >= 2 && passes[passes.length - 2].result === 'complete')
				passes[passes.length - 2].x1 = currentPass.x0;
		}
	}

	passes[passes.length - 1] = {
		...currentPass,
		...data,
	};
	currentPass = passes[passes.length - 1];

	//there is a receiver and location - pass was completed.
	if (
		currentPass.receiver &&
		currentPass.x1 !== undefined &&
		currentPass.y1 !== undefined
	) {
		if (!currentPoint.possession) {
			showMessage('error', 'Invalid pass data - see log for details');
			return console.log(`Invalid pass: `, currentPass);
		}

		//set the result of this pass
		passes[passes.length - 1].result = 'complete';
		//add a new pass with the receiver as the thrower and the origin as the current location
		passes.push({
			...blankPass,
			thrower: currentPass.receiver,
			x0: currentPass.x1,
			y0: currentPass.y1,
		});
		if (clearPoppedPasses) state.poppedPasses = [];
	} else if (currentPass.result) {
		//we got here by clicking a result button - stall, drop, throwaway, goal. Handle those things here.
		if (currentPoint.possession) {
			if (data.result === 'stall' && currentPass.thrower) {
				passes[passes.length - 1].turnover = true;
				passes.push({ ...blankPass, x1: currentPass.x0, y1: currentPass.y0 });
				drawLine(null);
			} else if (data.result === 'drop' && currentPass.thrower) {
				passes.pop();
				passes[passes.length - 1].result = 'drop';
				passes[passes.length - 1].turnover = true;
				passes.push({ ...blankPass, x1: currentPass.x1, y1: currentPass.y1 });
				drawLine(null);
			} else if (
				currentPass.result === 'throwaway' &&
				currentPass.x1 !== undefined &&
				currentPass.y1 !== undefined
			) {
				passes[passes.length - 1].turnover = true;
				passes.push({ ...blankPass, x1: currentPass.x1, y1: currentPass.y1 });
				drawLine(null);
			} else if (data.result === 'goal') {
				if (currentPass.x0 >= state.format.length + state.format.endzone) {
					passes.pop();
					passes[passes.length - 1].goal = 1;
					currentPoint.scored = 1;
					state.discIn = false;
					state.score++;
					const evt = new CustomEvent('point-ended', {
						detail: {
							state,
						},
					});
					document.dispatchEvent(evt);
				} else {
					showMessage(
						'error',
						'The last pass was not into the endzone. Undo it and place it in the endzone.'
					);
				}
			}
			deselectAll();
		} else {
			if (currentPass.result === 'goal') {
				passes.pop();
				passes[passes.length - 1].goal = -1;
				currentPoint.scored = -1;
				state.discIn = false;
				state.oppScore++;
				const evt = new CustomEvent('point-ended', {
					detail: {
						state,
					},
				});
				document.dispatchEvent(evt);
			}
			//opponent got stalled out.
			else if (currentPass.result === 'stall') {
				passes.push({ ...blankPass });
			} else if (
				currentPass.result === 'drop' ||
				currentPass.result === 'throwaway'
			) {
				passes[passes.length - 1].result = currentPass.result;
				passes.push({ ...blankPass });
			}
			deselectAll();
		}
		if (clearPoppedPasses) state.poppedPasses = [];
	} else if (currentPass.defender) {
		//we are on D...possession SHOULD be false here
		if (currentPoint.possession) return;

		passes[passes.length - 1].turnover = true;
		passes.push({ ...blankPass, x1: currentPass.x1, y1: currentPass.y1 });
		state.currentPoint.possession = true;
		deselectAll();
		if (clearPoppedPasses) state.poppedPasses = [];
	}

	if (data.turnover) state.currentPoint.possession = !currentPoint.possession;
	sh.setState({
		...state,
		currentPoint: {
			...state.currentPoint,
			passes,
		},
	});
	if (
		(passes.length % 3 === 1 && passes.length > 1) ||
		currentPass.result === 'goal'
	) {
		updatePasses();
	}
};

const setPlayer = (e) => {
	if (!sh) return;
	const possession = sh.getState()?.currentPoint?.possession;
	if (possession === null || possession === undefined) return;
	const sel = document.querySelector('.player-button[selected]');
	if (sel) sel.removeAttribute('selected');
	if (!e || !e.target) return;

	const b = e.target.closest('.player-button');
	if (b && b !== sel) {
		b.setAttribute('selected', '');
		if (possession)
			updateCurrentPass({
				receiver: b.getAttribute('data-id') || 'unknown',
			});
		else
			updateCurrentPass({
				defender: b.getAttribute('data-id') || 'unknown',
			});
	} else if (b === sel) {
		if (possession)
			updateCurrentPass({
				receiver: '',
			});
		else
			updateCurrentPass({
				defender: '',
			});
	}
};

//draw the disc at the page coordinates indicated - this will not update any game data.
const drawDisc = (pageX, pageY) => {
	const r = field.getBoundingClientRect();
	const [fTop, fLeft] = [r.top, r.left];
	const newX = Math.min(Math.max(0, pageX - fLeft), r.width);
	const newY = Math.min(Math.max(0, pageY - fTop), r.height);
	if (!isNaN(newX)) disc.style.left = `${newX}px`;
	if (!isNaN(newY)) disc.style.top = `${newY}px`;
};

//draw a line at the page coordinates indicated
const drawLine = (x0, y0, x1, y1) => {
	if (!discLine) return;
	if (
		[x0, y0, x1, y1].some((el) => {
			return isNaN(el);
		})
	) {
		discLine.classList.add('invisible');
		return;
	}

	const r = field.getBoundingClientRect();

	x0 = Math.min(Math.max(x0, r.left), r.right);
	x1 = Math.min(Math.max(x1, r.left), r.right);
	y0 = Math.min(Math.max(y0, r.top), r.bottom);
	y1 = Math.min(Math.max(y1, r.top), r.bottom);

	let angle = Math.atan((y1 - y0) / (x1 - x0));
	if (x1 < x0) angle = angle - Math.PI;
	discLine.style.width = `${Math.sqrt(
		Math.pow(y1 - y0, 2) + Math.pow(x1 - x0, 2)
	)}px`;
	discLine.style.transform = `translate(0,-50%) rotate(${angle}rad)`;
	const st = window.getComputedStyle(disc);
	discLine.style.left = `${x0 - r.left}px`;
	discLine.style.top = `${y0 - r.top}px`;
	discLine.classList.remove('invisible');
};

//event fires when we move the disc around. On touchend or mouseup, we update the data.
const setDiscPosition = (e) => {
	state = sh.getState();
	if (!state) return;

	//don't do anything if the disc isn't movable
	if (!disc || !state.discIn) return;

	//if we start moving the disc, set the flag "moving" to be true
	if (
		(e.type === 'mousedown' || e.type === 'touchstart') &&
		(e.target === disc || e.target === field)
	)
		moving = true;
	//if we're not moving, and we didn't get here by a button, also get out.
	else if (!moving && e.target.getAttribute('role') !== 'button') return;

	let pageX, pageY;
	//figure out where the disc is
	if (isMobile && (e.target === disc || e.target === field)) {
		//if we are on mobile and it's a touchend event, the location is the changed touch
		if (e.type === 'touchend') {
			({ pageX, pageY } = e.changedTouches[0]);
		} else {
			//if we're on mobile and it's a touchmove or touchstart event, it's the first target touch
			({ pageX, pageY } = e.targetTouches[0]);
		}
	} else if (e.target === disc || e.target === field) {
		//if not mobile, it's just the pageX and pageY from the mouse event
		({ pageX, pageY } = e);
	} else if (
		(e.target.getAttribute('data-x') || e.target.getAttribute('data-y')) &&
		e.type === 'click'
	) {
		//we got here by clicking a positioning button - get the X and Y from the button attributes
		let [x1, y1] = [
			parseFloat(e.target.getAttribute('data-x')),
			parseFloat(e.target.getAttribute('data-y')),
		];

		[pageX, pageY] = getPageCoordinates(x1, y1);
	}
	//don't do anything if we do a touchend or mouseup.
	else if (e.type !== 'touchend' && e.type !== 'mouseup') return;

	//draw the disc
	if (
		moving ||
		(e.target.classList.contains('dropdown-item') &&
			e.target.getAttribute('role') === 'button')
	) {
		drawDisc(pageX, pageY);
		const thisPass =
			state.currentPoint.passes.length > 0
				? state.currentPoint.passes.slice(-1).pop()
				: undefined;
		if (thisPass) {
			let [x0, y0] = getPageCoordinates(
				Math.min(thisPass.x0, state.format.endzone + state.format.length),
				thisPass.y0
			);
			//and the line if we have two coordinates
			drawLine(x0, y0, pageX, pageY);
		}
	}

	const [x1, y1] = getYards(pageX, pageY);

	if (
		e.type === 'touchend' ||
		e.type === 'mouseup' ||
		(e.target.classList.contains('dropdown-item') &&
			e.target.getAttribute('role') === 'button')
	) {
		if (state.currentPoint.lineup.length > 0) updateCurrentPass({ x1, y1 });
		else updateCurrentPass({ x1, y1, receiver: 'Unknown' });
		moving = false;
	}
};

const addPlayerButton = (p, color) => {
	if (!buttonRowContainer) return;

	//create the button
	const b = createElement(
		`button.player-button.${color}.d-flex.flex-column.align-items-center[data-id="${
			p ? p.id : 'Unknown'
		}"][data-name="${p ? p.firstName : 'Unknown'}"]`
	);
	const nm = createElement('.jersey-name');
	nm.innerHTML = p ? p.initials : '??';
	const num = createElement('.jersey-number');
	num.innerHTML = p ? p.number : 'XX';
	b.appendChild(nm);
	b.appendChild(num);
	b.addEventListener('click', setPlayer);

	//get all the existing rows
	const rows = getElementArray(buttonRowContainer, '.button-row');
	//see if any row doesn't already have 4 buttons on it
	if (
		rows.length === 0 ||
		!rows.some((r) => {
			if (r.querySelectorAll('.player-button').length < 4) {
				r.appendChild(b);
				return true;
			}
		})
	) {
		const lastRow = createElement('.button-row');
		buttonRowContainer.appendChild(lastRow);
		lastRow.appendChild(b);
	}
};

const positionSort = (a, b) => {
	if (!a) return 1;
	if (!b) return -1;

	const pos = ['C', 'Hy', 'H'];
	const f = (pl) => {
		return (p) => {
			return p === pl.position;
		};
	};
	const a1 = pos.findIndex(f(a));
	const b1 = pos.findIndex(f(b));
	if (a1 !== b1) return a1 - b1;
	// else return a.number.localeCompare(b.number, undefined, { numeric: true });
	else return a.name.localeCompare(b.name);
};

const handleLoadPoint = (e) => {
	if (!sh) sh = new StateHandler({ ...e.detail, poppedPasses: [] });
	else sh.setState({ ...e.detail, poppedPasses: [] });
	state = sh.getState();

	if (state.currentPoint) {
		if (!state.discIn) state.discIn = true;

		state.currentPoint.possession = state.currentPoint.offense;
		state.currentPoint.passes.forEach((p) => {
			if (p.turnover)
				state.currentPoint.possession = !state.currentPoint.possession;
		});

		drawLine(null);
		const [x, y] = getPageCoordinates(
			state.format.length / 2 + state.format.endZone,
			state.format.width / 2
		);
		drawDisc(x, y);

		let lastPass, currentPass;
		for (var i = state.currentPoint.passes.length - 1; i >= 0; i--) {
			if (!state.currentPoint.passes[i].event) {
				if (!currentPass) currentPass = state.currentPoint.passes[i];
				else {
					lastPass = state.currentPoint.passes[i];
					break;
				}
			}
		}
		if (lastPass && !isNaN(lastPass.x1) && !isNaN(lastPass.y1)) {
			let [x1, y1] = getPageCoordinates(lastPass.x1, lastPass.y1);
			drawDisc(x1, y1);

			if (!isNaN(lastPass.x0) && !isNaN(lastPass.y0)) {
				let [x0, y0] = getPageCoordinates(lastPass.x0, lastPass.y0);
				drawLine(x0, y0, x1, y1);
			}
		}

		sh.setState(state);
		if (state.currentPoint.scored !== 1 && state.currentPoint.scored !== -1) {
			showDiv(actionArea);
		}
	}
};

const displayPossession = (state) => {
	if (!state || !state.currentPoint) return;

	//display the arrow
	teamDirection.classList.remove('left', 'right');
	oppDirection.classList.remove('left', 'right');
	//no passes - set possession based on who is receiving the pull
	if (state.currentPoint.passes.length === 0) {
		if (state.currentPoint.offense) {
			if (state.currentPoint.direction === 1)
				teamDirection.classList.add('right');
			else teamDirection.classList.add('left');
		} else {
			if (state.currentPoint.direction === 1)
				oppDirection.classList.add('left');
			else oppDirection.classList.add('right');
		}
	}
	//someone has scored - don't display anything
	else if (state.currentPoint.scored !== 0) return;
	//we have possession
	else if (state.currentPoint.possession) {
		if (state.currentPoint.direction === 1)
			teamDirection.classList.add('right');
		else teamDirection.classList.add('left');
	}
	//they have possession
	else {
		if (state.currentPoint.direction === 1) oppDirection.classList.add('left');
		else oppDirection.classList.add('right');
	}
};

const handlePlayerButtons = (e) => {
	if (!e.detail) return;

	let count = 0;

	//get the array of players
	const players = e.detail.currentPoint.lineup
		.map((p) => {
			const r = e.detail.roster.find((pl) => {
				if (pl.id === p) {
					count++;
					return true;
				}
			});
			return {
				...r,
				initials: `${r.firstName.charAt(0)}${r.lastName.charAt(
					0
				)}`.toUpperCase(),
			};
		})
		.sort(positionSort);

	//see if any players have changed
	const currentLineup = getElementArray(e.target, '.player-button');

	//anyone in the currentLineup has been removed?
	let playerRemoved = currentLineup.some((b) => {
		//see if there is some player in the current (old) lineup...
		return players.every((p) => {
			//whose ID is not in the players array
			return p.id !== b.getAttribute('data-id');
		});
	});

	let playerAdded = false;
	if (!playerRemoved) {
		//anyone been added?
		playerAdded = players.some((b) => {
			//see if there's someone in the new lineup...
			return currentLineup.every((p) => {
				//...whose ID is not already a button
				return b.id !== p.getAttribute('data-id');
			});
		});
	}
	//if no one was added or removed, we don't do anything further.
	if (!playerRemoved && !playerAdded) return;

	//create the initials for each player
	let cycles = 0;
	while (
		cycles < 3 &&
		players.some((p, i) => {
			return players.some((p2, j) => {
				if (p2.initials === p.initials && i !== j) {
					p2.initials = `${propCase(
						p2.firstName.substring(0, cycles + 1)
					)}${propCase(p2.lastName.substring(0, cycles + 1))}`;
					p.initials = `${propCase(
						p.firstName.substring(0, cycles + 1)
					)}${propCase(p.lastName.substring(0, cycles + 1))}`;
					return true;
				}
			});
		})
	) {
		cycles++;
	}

	getElementArray(document, '.player-button').forEach((b) => {
		b.remove();
	});

	players.forEach((p) => {
		if (p) addPlayerButton(p, e.detail.startSettings.jersey);
	});
	if (count < e.detail.format.players)
		addPlayerButton(null, e.detail.startSettings.jersey);

	if (e.detail.currentPoint.passes && e.detail.currentPoint.passes.length > 0) {
		const thisPass = e.detail.currentPoint.passes.slice(-1).pop();
		const b = e.target.querySelector(
			`.player-button[data-id="${thisPass.thrower}"]`
		);
		if (b) b.setAttribute('selected', '');
	}
};

const handleUndoRedoButtons = (state) => {
	if (!state) {
		undo.disabled = true;
		redo.disabled = true;
		return;
	}

	redo.disabled =
		!Array.isArray(state.poppedPasses) || state.poppedPasses.length === 0;

	const passes = state.currentPoint?.passes;

	if (Array.isArray(passes)) {
		undo.disabled = passes.length <= 1;
	} else {
		undo.disabled = true;
	}
};

const handleResultButtons = (state) => {
	drop.disabled = true;
	throwaway.disabled = true;
	goal.disabled = true;
	if (!state) return;
	if (!state.currentPoint || state.currentPoint.passes.length < 2) return;

	const passes = state.currentPoint.passes.slice(-2);

	//if we're on defense, all 3 events are possible for the other team
	if (!state.currentPoint.possession) {
		drop.disabled = false;
		throwaway.disabled = false;
		goal.disabled = false;
		return;
	}

	//we're on offense
	if (passes[0].result === 'complete') {
		//drop button - we need a "completed" pass to mark as actually a drop
		drop.disabled = false;
		//goal button - we need a "completed" pass in the end zone.
		if (passes[0].x1 >= state.format.endzone + state.format.length)
			goal.disabled = false;
	}

	//throwaway button - we need a thrower, no receiver, and a location
	if (
		passes[1].thrower &&
		!passes[1].receiver &&
		!isNaN(passes[1].x1) &&
		!isNaN(passes[1].x0) &&
		!isNaN(passes[1].y1) &&
		!isNaN(passes[1].y0)
	)
		throwaway.disabled = false;
};

document.addEventListener('DOMContentLoaded', () => {
	sh = new StateHandler(null);
	document.addEventListener('load-point', handleLoadPoint);

	field.addEventListener('click', setDiscPosition);
	disc.addEventListener('mousedown', setDiscPosition);
	field.addEventListener('mousedown', setDiscPosition);
	document.body.addEventListener('mouseup', setDiscPosition);
	document.body.addEventListener('mousemove', setDiscPosition);
	document.body.addEventListener('touchend', setDiscPosition);

	document.addEventListener(
		'touchstart',
		(e) => {
			isMobile = true;
			field.removeEventListener('mousedown', setDiscPosition);
			document.body.removeEventListener('mouseup', setDiscPosition);
			document.body.removeEventListener('mousemove', setDiscPosition);
			field.removeEventListener('click', setDiscPosition);
			setDiscPosition({
				...e,
				type: e.type,
				target: e.target,
				targetTouches: e.targetTouches,
			});
			field.addEventListener('touchstart', setDiscPosition);
			document.body.addEventListener('touchmove', setDiscPosition);
		},
		{ once: true }
	);

	brick.addEventListener('click', setDiscPosition);
	ownGoal.addEventListener('click', setDiscPosition);
	attackingGoal.addEventListener('click', setDiscPosition);
	revBrick.addEventListener('click', setDiscPosition);
	midfield.addEventListener('click', setDiscPosition);
	centerDisc.addEventListener('click', setDiscPosition);

	//events
	const evArray = [
		'stall',
		'drop',
		'throwaway',
		'goal',
		'sub',
		'point-timeout-us',
		'point-timeout-them',
	];
	const events = (() => {
		let obj = {};
		evArray.forEach((a) => {
			const b = document.querySelector(`#${a}`);
			if (a.search('timeout') >= 0) b.setAttribute('data-event', 'timeout');
			else b.setAttribute('data-event', a);
			b.addEventListener('click', handleEvent);
			obj[a] = document.querySelector(`#${a}`);
		});
		return obj;
	})();

	undo.addEventListener('click', undoPass);
	redo.addEventListener('click', redoPass);

	ourTimeout.addEventListener('click', handleTimeout);
	theirTimeout.addEventListener('click', handleTimeout);

	sh.addWatcher(buttonRowContainer, handlePlayerButtons);
	sh.addWatcher(null, displayPossession);
	sh.addWatcher(lastEvent, displayEventDescription);
	sh.addWatcher(null, handleUndoRedoButtons);
	sh.addWatcher(null, handleResultButtons);
	window.addEventListener('beforeunload', (e) => {
		e.preventDefault();
		// updatePasses();
	});
});
