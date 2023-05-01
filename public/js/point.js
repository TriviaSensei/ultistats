import { showMessage } from './utils/messages.js';
import { handleRequest } from './utils/requestHandler.js';
import { createElement } from './utils/createElementFromSelector.js';
import { getElementArray } from './utils/getElementArray.js';
import { showDiv } from './utils/showDiv.js';
import { StateHandler } from './utils/stateHandler.js';
import { propCase } from './utils/propCase.js';
import { showEvent } from './utils/showEvent.js';
let sh;

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

let isMobile = false;

const teamDirection = document.querySelector('#team-direction');
const oppDirection = document.querySelector('#opp-direction');

const field = document.querySelector('#field-canvas');
const disc = document.querySelector('.disc');
const discLine = document.querySelector('.disc-line');
const undo = document.querySelector('#undo-button');
const redo = document.querySelector('#redo-button');
const lastEvent = document.querySelector('#event-desc');
const buttonRowContainer = document.querySelector('#button-row-container');

const ourTimeout = document.querySelector('#point-timeout-us');
const theirTimeout = document.querySelector('#point-timeout-them');
const sub = document.querySelector('#sub');

const subModal = new bootstrap.Modal(document.querySelector('#sub-modal'));
const subForm = document.querySelector('#sub-form');
const clearSubs = document.querySelector('#clear-subs');
const playerIn = document.querySelector('#player-in');
const playerOut = document.querySelector('#player-out');

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

let initialLength = 1;

/**Testing only */
const reset = document.querySelector('#reset');
reset.addEventListener('click', () => {
	if (!sh) return;
	const id = sh.getState()._id;
	if (!id) return;

	const str = `/api/v1/games/clear/${id}`;
	const handler = (res) => {
		if (res.status === 'success') {
			location.reload();
		}
	};
	handleRequest(str, 'PATCH', null, handler);
});

const resetPoint = document.querySelector('#reset-point');
resetPoint.addEventListener('click', () => {
	if (!sh) return;
	const id = sh.getState()._id;
	if (!id) return;

	const str = `/api/v1/games/resetPoint/${id}`;
	const handler = (res) => {
		if (res.status === 'success') {
			location.reload();
		}
	};
	handleRequest(str, 'PATCH', null, handler);
});
/*****************/

const sendEvent = (name, data) => {
	const evt = new CustomEvent(name, {
		detail: data,
	});
	document.dispatchEvent(evt);
};

const getYards = (pageX, pageY) => {
	if (!sh) return [null, null];
	const state = sh.getState();
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
	const state = sh.getState();

	const r = field.getBoundingClientRect();
	let pctX = x / (state.format.length + 2 * state.format.endzone);
	let pctY = y / state.format.width;
	if (state.currentPoint.direction === -1) {
		pctX = 1 - pctX;
		pctY = 1 - pctY;
	}
	const toReturn = [pctX * r.width + r.left, pctY * r.height + r.top];
	return toReturn;
};

const deselectAll = () => {
	getElementArray(document, 'button[selected]').forEach((b) => {
		b.removeAttribute('selected');
	});
};

const updatePasses = () => {
	if (!sh) return;
	const state = sh.getState();
	const str = `/api/v1/games/setPasses/${state._id}`;
	const body = state.currentPoint;
	const handler = (res) => {
		if (res.status !== 'success') {
			showMessage(
				'error',
				`Error updating passes in database - ${res.message}`
			);
		} else {
			initialLength = state.currentPoint.passes.length;
		}
	};
	handleRequest(str, 'PATCH', body, handler);
};

const handleTimeout = (e) => {
	if (!sh) return;
	const state = sh.getState();
	if (!state) return;
	if (
		!state.timeoutsLeft ||
		!Array.isArray(state.timeoutsLeft) ||
		state.timeoutsLeft.length !== 2
	)
		return;

	let team;
	const onlyPasses = state.currentPoint.passes.filter((p) => {
		return p.event === '';
	});
	if (e.target === ourTimeout) {
		if (!state.currentPoint.possession && onlyPasses.length > 0) {
			//if we don't have possession, we can't call a timeout, except at point start
			if (onlyPasses.length > 1)
				return showMessage(
					'error',
					'Your team is not in possession of the disc.'
				);
			//if there's already been a timeout call, there will be a blank pass, so account for that.
			//if it's no longer a blank pass, then we can't call a timeout
			else if (
				onlyPasses[0].player &&
				!isNaN(onlyPasses[0].x) &&
				onlyPasses[0].x !== null &&
				!isNaN(onlyPasses[0].y) &&
				onlyPasses[0].y !== null
			)
				return showMessage(
					'error',
					'Your team is not in possession of the disc.'
				);

			if (state.timeoutsLeft[0] <= 0)
				return showMessage('error', 'Your team has no timeouts left.');
			else {
				state.timeoutsLeft[0]--;
				sh.setState(state);
				updateCurrentPass(
					{
						event: 'timeout',
						eventDesc: {
							team: 1,
							in: '',
							out: '',
						},
					},
					{
						redo: e.redo,
					}
				);
				return sendEvent('update-info', sh.getState());
			}
		}
		let currentPlayer;
		for (var i = state.currentPoint.passes.length - 2; i >= 0; i--) {
			if (!state.currentPoint.passes[i].offense) break;
			if (state.currentPoint.passes[i].player) {
				currentPlayer = state.currentPoint.passes[i].player;
				break;
			}
		}
		if (!currentPlayer && state.currentPoint.passes.length > 0)
			return showMessage(
				'error',
				'You must select a player to possess the disc.'
			);
		if (state.timeoutsLeft[0] <= 0)
			return showMessage('error', 'Your team has no timeouts left.');
		state.timeoutsLeft[0]--;
		team = 1;
	} else if (e.target === theirTimeout) {
		if (state.currentPoint.possession && state.currentPoint.passes.length > 0) {
			if (onlyPasses.length > 1)
				return showMessage(
					'error',
					'Opponent is not in possession of the disc.'
				);
			else if (
				onlyPasses[0].player &&
				!isNaN(onlyPasses[0].x) &&
				onlyPasses[0].x !== null &&
				!isNaN(onlyPasses[0].y) &&
				onlyPasses[0].y !== null
			)
				return showMessage(
					'error',
					'Opponent is not in possession of the disc.'
				);
		}

		if (state.timeoutsLeft[1] <= 0)
			return showMessage('error', 'Opponent has no timeouts left.');
		state.timeoutsLeft[1]--;
		team = -1;
	} else return;

	sh.setState(state);
	updateCurrentPass(
		{
			event: 'timeout',
			eventDesc: {
				team,
				in: '',
				out: '',
			},
		},
		{
			redo: e.redo,
		}
	);
	sendEvent('update-info', sh.getState());
};

// const showEvent = (msg) => {
// 	if (Array.isArray(msg)) {
// 		let str = '';
// 		msg.forEach((m, i) => {
// 			if (i !== 0) str = `${str}<br>`;
// 			str = `${str}${m}`;
// 		});
// 		lastEvent.innerHTML = str;
// 	} else if ((typeof msg).toLowerCase() === 'string') {
// 		lastEvent.innerHTML = msg;
// 	}
// };

const getPlayer = (id) => {
	const blank = {
		firstName: 'Unknown',
		lastName: 'Unknown',
		id: undefined,
		number: undefined,
	};
	if (!sh || !id) return blank;

	const state = sh.getState();

	const toReturn = state.roster.find((p) => {
		return p.id === id;
	});
	if (!toReturn) return blank;
	return toReturn;
};

const displayEventDescription = (e) => {
	if (!e.detail) return;
	const state = e.detail;

	const currentPoint = state.currentPoint;
	const passes = state.currentPoint?.passes;
	if (!passes || !Array.isArray(passes)) return showEvent('(No events)');

	console.log(passes);

	if (
		passes.length === 0 ||
		(passes.length === 1 &&
			(!passes[0].player ||
				isNaN(passes[0].x) ||
				isNaN(passes[0].y) ||
				passes[0].x === null ||
				passes[0].y === null))
	) {
		if (currentPoint.offense)
			return showEvent(`${state.opponent} pulls to ${state.team}`);
		else return showEvent(`${state.team} pulls to ${state.opponent}`);
	}
	//last thing is a goal, so indicate someone scored
	else if (passes.slice(-1).pop().goal !== 0) {
		const lp = passes.slice(-1).pop();
		if (lp.goal === -1) return showEvent(`${state.opponent} scored`);
		const p = getPlayer(lp.player);
		return showEvent(`${p.firstName} scored`);
	}
	//last thing isn't a goal, so the last thing is going to be a pass with incomplete data.
	//start at second to last, get the last thing to happen
	else {
		//get the last two touches and the last event (if it happened after the first of those two touches)
		let lastThree = [];
		let eventFound = false;
		const topPass = passes.slice(-1).pop();
		const selfPassWarning =
			!topPass.player &&
			(isNaN(topPass.x + topPass.y) ||
				topPass.x === null ||
				topPass.y === null);
		for (var i = passes.length - 2; i >= 0; i--) {
			if ((!eventFound && passes[i].event) || passes[i].result)
				lastThree.push({
					...passes[i],
					id: passes[i].player,
					player: passes[i].player
						? getPlayer(passes[i].player).firstName
						: 'Unknown',
				});
			if (passes[i].event) eventFound = true;
			if (lastThree.length === 3 || (lastThree.length === 2 && !eventFound))
				break;
		}
		//if we only got one thing, the whole pass array must be only one element.
		let events = [];
		if (lastThree.length === 1) {
			if (lastThree[0].event) {
				if (lastThree[0].event === 'timeout') {
					if (lastThree[0].eventDesc.team === 1)
						events.push(`${state.team} took a timeout`);
					else events.push(`${state.opponent} took a timeout`);
				} else if (lastThree[0].event === 'sub') {
					const playerIn = getPlayer(lastThree[0].eventDesc.in);
					const playerOut = getPlayer(lastThree[0].eventDesc.out);
					events.push(
						`${playerIn.firstName} came in for ${playerOut.firstName}`
					);
				}
				if (currentPoint.offense) {
					events.push(`${state.opponent} pulls to ${state.team}`);
				} else {
					if (isNaN(parseFloat(lastThree[0].x + lastThree[0].y)))
						events.push(`${state.team} pulls to ${state.opponent}`);
					else events.push(`${state.opponent} has the disc`);
				}
				return showEvent(events);
			} else if (lastThree[0].offense) {
				if (lastThree[0].result === 'complete') {
					const place = getPlace(lastThree[0].x);
					return showEvent(
						`${lastThree[0].player} picked up the pull ${place}`
					);
				} else if (lastThree[0].result === 'drop')
					return showEvent(
						`${lastThree[0].player} dropped the pull<br>${state.opponent} have the disc`
					);
			} else if (['drop', 'throwaway', 'stall'].includes(lastThree[0].result)) {
				let ev;
				switch (lastThree[0].result) {
					case 'drop':
						ev = 'dropped the disc';
						break;
					case 'throwaway':
						ev = 'threw the disc away';
						break;
					case 'stall':
						ev = 'got stalled out';
						break;
				}
				return showEvent(
					`${state.opponent} ${ev}<br>${state.team} to pick up the disc.`
				);
			} else return showEvent(`${state.opponent} have the disc`);
		} else {
			//in order, the events described by the last 3 elements: E(vent), O(ffense), D(efense)
			let order = lastThree.reduce((p, c) => {
				return `${c.event ? 'E' : c.offense ? 'O' : 'D'}${p}`;
			}, '');

			/*
			Possible orders:
			?OO
			?DO
			??D
			??E
			?EO
			*/
			switch (true) {
				//last two things were both offense
				case order.substring(order.length - 2, order.length) === 'OO':
					switch (lastThree[0].result) {
						case 'complete':
							const dx = Math.round(lastThree[0].x - lastThree[1].x);
							if (
								selfPassWarning &&
								lastThree[0].id &&
								lastThree[0].id === lastThree[1].id
							)
								showMessage('warning', 'Warning - self-pass detected');
							return showEvent(
								`${lastThree[1].player} → ${lastThree[0].player} (${
									dx >= 0 ? '+' : ''
								}${dx})`
							);
						case 'drop':
							return showEvent(
								`${lastThree[0].player} dropped the disc<br>${state.opponent} have the disc`
							);
						case 'throwaway':
							return showEvent(
								`${lastThree[1].player} threw the disc away<br>${state.opponent} have the disc`
							);
						case 'stall':
							return showEvent(
								`${lastThree[1].player} got stalled out<br>${state.opponent} have the disc`
							);
						default:
							showMessage('error', 'Invalid data');
							return console.log(lastThree);
					}
				//they turned it, we picked it up
				case order.substring(order.length - 2, order.length) === 'DO':
					const place = getPlace(lastThree[0].x);
					return showEvent(
						`${lastThree[0].player} picked up the disc ${place}`
					);
				//last thing is defense - they turned it (we got a block or they dropped/threw it away)
				case order.charAt(order.length - 1) === 'D':
					switch (lastThree[0].result) {
						case 'drop':
							return showEvent(
								`${state.opponent} dropped the disc<br>${state.team} to pick up`
							);
						case 'throwaway':
							return showEvent(
								`${state.opponent} threw the disc away<br>${state.team} to pick up`
							);
						case 'block':
							return showEvent(
								`${lastThree[0].player} got a block<br>${state.team} to pick up`
							);
						case 'stall':
							return showEvent(
								`${state.opponent} got stalled out<br>${state.team} have the disc`
							);
						default:
							showMessage('error', 'Invalid data');
							return console.log(lastThree);
					}
				//timeout or sub was the last thing
				case order.charAt(order.length - 1) === 'E':
					if (lastThree[0].event === 'timeout') {
						if (lastThree[0].eventDesc.team === 1) {
							events.push(`${state.team} took a timeout`);
							events.push(`${lastThree[1].player} has the disc`);
							return showEvent(events);
						} else events.push(`${state.opponent} took a timeout`);
					} else if (lastThree[0].event === 'sub') {
						const playerIn = getPlayer(lastThree[0].eventDesc.in);
						const playerOut = getPlayer(lastThree[0].eventDesc.out);
						events.push(
							`${playerIn.firstName} came in for ${playerOut.firstName}`
						);
						if (order.charAt(0) === 'O') {
							events.push(`${lastThree[1].player} has the disc`);
						} else {
							events.push(`${state.opponent} have the disc`);
						}
					}
					break;
				//event then offense
				case order.substring(order.length - 2, order.length) === 'EO':
					//this should only happen when picking up the pull after a timeout or an immediate sub before the point happens
					if (order.length === 2) {
						const place = getPlace(lastThree[0].x);
						return showEvent(
							`${lastThree[0].player} picked up the pull ${place}`
						);
					}
					//OEO - just a complete pass with a timeout or sub that happened while the disc was in the thrower's hands
					else if (order === 'OEO') {
						switch (lastThree[0].result) {
							case 'complete':
								const dx = Math.round(lastThree[0].x - lastThree[2].x);
								if (
									selfPassWarning &&
									lastThree[0].id &&
									lastThree[0].id === lastThree[2].id
								)
									showMessage('warning', 'Warning - self-pass detected');
								return showEvent(
									`${lastThree[2].player} → ${lastThree[0].player} (${
										dx >= 0 ? '+' : ''
									}${dx})`
								);
							case 'drop':
								return showEvent(
									`${lastThree[0].player} dropped the disc<br>${state.opponent} have the disc`
								);
							case 'throwaway':
								return showEvent(
									`${lastThree[0].player} threw the disc away<br>${state.opponent} have the disc`
								);
							default:
								showMessage('error', 'Invalid data');
								return console.log(lastThree);
						}
					}
					//DEO - this could happen if we force a turn, there's a sub, and then we pick up the disc
					else if (order === 'DEO') {
						const place = getPlace(lastThree[0].x);
						return showEvent(
							`${lastThree[0].player} picked up the disc ${place}`
						);
					} else {
						showMessage('error', 'Invalid data');
						return console.log(lastThree);
					}
				default:
					showMessage('error', 'Invalid data');
					return console.log(lastThree);
			}
		}
		return showEvent(events);
	}
};

/**
 * TODO:
 * Verify that event (TO/Sub) is valid
 * Send updater to updatecurrentpass
 */
const handleEvent = (e) => {
	if (!sh) return;
	const state = sh.getState();

	const eventName = e.target?.getAttribute('data-event');
	if (!eventName) return;

	if (eventName === 'sub') {
		playerIn.selectedIndex = 0;
		playerOut.selectedIndex = 0;
		return subModal.show();
	}

	const currentPoint = state.currentPoint;
	const passes = currentPoint.passes;
	let currentPass, lastPass;
	for (var i = passes.length - 2; i >= 0; i--) {
		if (!passes[i].event) {
			if (!currentPass) currentPass = passes[i];
			else {
				lastPass = passes[i];
				break;
			}
		} else if (!passes[i].offense) break;
	}

	if (currentPoint.possession) {
		switch (eventName) {
			case 'stall':
				//on offense, we must have an active player at a specific location.
				if (!currentPass) return showMessage('error', 'Invalid game event');
				//this will happen if the opponent turns it over, but we haven't picked up the disc
				if (!currentPass.offense) {
					if (!passes.slice(-1).pop().player)
						return showMessage(
							'error',
							'You must select a player to possess the disc.'
						);
					else
						return showMessage(
							'error',
							'You must select a location for the disc.'
						);
				}
				//on defense, the stall button can be pressed anytime.
				break;
			case 'drop':
				//on offense, we must have a completed pass that we will change to a drop
				if (
					!currentPass ||
					!currentPass.offense ||
					currentPass.result !== 'complete' ||
					//it cannot be the first touch of the possession (you can't have a drop without a throw)
					!lastPass
				)
					return showMessage('error', 'Invalid game event');
				break;
			case 'throwaway':
				if (
					!currentPass ||
					!currentPass.offense ||
					currentPass.result !== 'complete'
				)
					return showMessage('error', 'Invalid game event');
				const cp = passes.slice(-1).pop();
				if (cp.x === null || cp.y === null || isNaN(cp.x + cp.y))
					return showMessage(
						'error',
						'You must select a location for the disc'
					);
				break;
			case 'goal':
				console.log(currentPass);
				//must have a current pass
				if (!currentPass) return showMessage('error', 'Invalid game event');
				//if we're not on offense, we are recording a callahan.
				if (!currentPass.offense) {
					//we must have recorded a block...
					if (currentPass.result !== 'block')
						return showMessage(
							'error',
							'You must select a player to pick up the disc.'
						);
					//...in the end zone
					if (currentPass.x < state.format.length + state.format.endzone)
						return showMessage('error', 'The disc was not the endzone.');
				} else if (currentPass.result !== 'complete') {
					return showMessage('error', 'Invalid game event');
				}
				if (currentPass.x < state.format.endzone + state.format.length)
					return showMessage(
						'error',
						'The last pass was not into the endzone.'
					);
				break;
			case 'timeout':
			case 'sub':
				break;
			default:
				return showMessage('error', 'Invalid game event');
		}
	}

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
	const state = sh.getState();
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

const drawLastPass = (state) => {
	if (!state || !state.currentPoint) return;
	const passes = state.currentPoint.passes;
	//if we are at the start of a point, just draw the disc in the middle of the field
	if (passes.length === 0) {
		const [pageX, pageY] = getPageCoordinates(
			state.format.length / 2 + state.format.endzone,
			state.format.width / 2
		);
		drawLine(null);
		return drawDisc(pageX, pageY);
	} else if (passes.length < 2) return drawLine(null);

	let lastPassStart, lastPassEnd;
	for (var i = passes.length - 1; i >= 0; i--) {
		if (!passes[i].offense) break;
		if (
			!lastPassEnd &&
			passes[i].x !== null &&
			passes[i].y !== null &&
			!isNaN(passes[i].x + passes[i].y)
		) {
			lastPassEnd = passes[i];
		} else if (
			lastPassEnd &&
			passes[i].x !== null &&
			passes[i].y !== null &&
			!isNaN(passes[i].x + passes[i].y)
		) {
			lastPassStart = passes[i];
			break;
		}
	}

	if (!lastPassEnd) return drawLine(null);
	const [pageX, pageY] = getPageCoordinates(lastPassEnd.x, lastPassEnd.y);
	drawDisc(pageX, pageY);

	if (!lastPassStart) return drawLine(null);

	const [x0, y0] = getPageCoordinates(lastPassStart.x, lastPassStart.y);
	drawLine(x0, y0, pageX, pageY);
};

const undoPass = (e) => {
	const state = sh.getState();
	//get rid of the blank pass at the end first
	const currentPass = state.currentPoint.passes.pop();

	console.log(currentPass);

	if (currentPass.goal !== 0) {
		state.poppedPasses.push(currentPass);
		state.currentPoint.passes.push({
			...blankPass,
			offense: currentPass.offense,
		});
		sh.setState(state);
		return sendEvent('return-to-point', state);
	}

	const lastPass = state.currentPoint.passes.pop();
	if (!lastPass) return;

	state.poppedPasses.push(lastPass);
	if (state.currentPoint.passes.length > 0)
		state.currentPoint.passes.push({
			...blankPass,
			offense: lastPass.offense,
		});

	if (lastPass.event === 'timeout') {
		if (lastPass.eventDesc.team === 1) {
			state.timeoutsLeft[0]++;
		} else if (lastPass.eventDesc.team === -1) {
			state.timeoutsLeft[1]++;
		}
		sendEvent('update-info', state);
	}
	sh.setState(state);
};

const redoPass = (e) => {
	if (e.target !== redo) return;
	const state = sh?.getState();
	if (!state || !state.poppedPasses || state.poppedPasses.length === 0) return;
	const toRedo = state.poppedPasses.pop();
	if (!toRedo) return;
	if (toRedo.event) {
		console.log(toRedo);
		if (toRedo.event === 'timeout') {
			if (Math.abs(toRedo.eventDesc?.team) !== 1)
				return showMessage('error', 'Invalid event');
			handleTimeout({
				target: toRedo.eventDesc.team === 1 ? ourTimeout : theirTimeout,
				redo: true,
			});
		}
	} else {
		updateCurrentPass(toRedo, { redo: true });
	}
};

//TODO: handle events (sub, timeout.)
const updateCurrentPass = (data, ...opts) => {
	if (!sh) return;
	let state = sh.getState();

	let clearPoppedPasses = true;
	if (opts.length > 0) {
		if (opts[0].redo) clearPoppedPasses = false;
	}

	const p = state.currentPoint?.passes;
	const passes =
		p.length === 0
			? [{ ...blankPass, offense: state.currentPoint.offense }]
			: p;

	let currentPass = passes[passes.length - 1];
	let currentPoint = state.currentPoint;

	//if we're updating a location, make sure we're not throwing it from the end zone,
	//and set the last pass ending spot to the goal line, at maximum)
	if (data.x) {
		if (
			currentPass.x &&
			currentPass.x > state.format.length + state.format.endzone
		) {
			currentPass.x = state.format.length + state.format.endzone;
			if (passes.length >= 2 && passes[passes.length - 2].result === 'complete')
				passes[passes.length - 2].x = currentPass.x;
		}
	}

	passes[passes.length - 1] = {
		...currentPass,
		...data,
	};
	currentPass = passes[passes.length - 1];

	console.log(passes);

	//there is a player and location - pass was completed.
	if (
		currentPass.player &&
		currentPass.x !== undefined &&
		currentPass.y !== undefined
	) {
		//if we were on offense, this is a complete pass (drops are recorded on the next action)
		//if we were on defense, this was a block recorded by the player indicated
		passes[passes.length - 1].result = currentPass.offense
			? 'complete'
			: 'block';
		//either way, push a new pass into the stack
		//if this was a d, we can set the location
		//if we were on offense, force the user to specify a new location for the next pass
		passes.push({
			...blankPass,
			x: currentPass.offense ? undefined : currentPass.x,
			y: currentPass.offense ? undefined : currentPass.y,
			offense: true,
		});
		state.currentPoint.possession = true;
		//anytime we push something, we need to clear the popped passes (you can't redo after overwriting something)
		if (clearPoppedPasses) state.poppedPasses = [];
	} else if (currentPass.result) {
		//we got here by clicking a result button - stall, drop, throwaway, goal. Handle those things here.
		if (currentPass.offense) {
			if (data.result === 'stall') {
				passes[passes.length - 1].turnover = true;
				state.currentPoint.possession = false;
			} else if (data.result === 'drop') {
				if (passes[passes.length - 2].result === 'complete') {
					passes.pop();
					passes[passes.length - 1].result = 'drop';
					passes[passes.length - 1].turnover = true;
					state.currentPoint.possession = false;
				} else {
					console.log(passes.slice(-2));
					return showMessage(
						'error',
						'Invalid data for dropped pass - see log for details'
					);
				}
			} else if (data.result === 'throwaway') {
				if (currentPass.x !== undefined && currentPass.y !== undefined) {
					passes[passes.length - 1].turnover = true;
					state.currentPoint.possession = false;
				} else
					return showMessage(
						'error',
						'You must specify a location for a throwaway'
					);
			} else if (data.result === 'goal') {
				if (
					passes[passes.length - 2].x >=
					state.format.length + state.format.endzone
				) {
					passes.pop();
					passes[passes.length - 1].goal = 1;
					currentPoint.scored = 1;
					state.discIn = false;
					state.score++;
					state = {
						...state,
						discIn: false,
						currentPoint: {
							...currentPoint,
							passes,
						},
					};
					sendEvent('point-ended', state);
					sh.setState(state);
					return updatePasses();
				} else {
					return showMessage(
						'error',
						'The last pass was not into the endzone. Undo it and place it in the endzone.'
					);
				}
			} else return showMessage('error', `Invalid action - ${data.result}.`);

			deselectAll();
			passes.push({
				...blankPass,
				x: currentPass.x,
				y: currentPass.y,
				offense: false,
			});
		} else {
			if (currentPass.result === 'goal') {
				passes[passes.length - 1].goal = -1;
				currentPoint.scored = -1;
				state.discIn = false;
				state.oppScore++;
				sendEvent('point-ended', state);
			}
			//opponent committed a turn.
			else {
				currentPass.turnover = true;
				passes.push({
					...blankPass,
					offense: true,
					x: currentPass.x,
					y: currentPass.y,
				});
				state.currentPoint.possession = true;
			}
			deselectAll();
		}
		if (clearPoppedPasses) state.poppedPasses = [];
	} else if (currentPass.event) {
		passes.push({
			...blankPass,
			offense: currentPass.offense,
		});
	}

	state = {
		...state,
		currentPoint: {
			...currentPoint,
			passes,
		},
	};
	sh.setState(state);
	if (
		(passes.length % 3 === 1 && passes.length > initialLength) ||
		currentPass.result === 'goal'
	) {
		updatePasses();
	}
};

const setPlayer = (e) => {
	if (!sh) return;
	const state = sh.getState();
	if (!state) return;
	const passes = state.currentPoint?.passes;
	if (!passes) return;

	const possession =
		passes.length === 0
			? state.currentPoint.offense
			: passes.slice(-1).pop().offense;
	if (possession === null || possession === undefined) return;

	const cp = passes.slice(-1).pop();
	if (
		possession &&
		(passes.length === 0 ||
			isNaN(cp.x + cp.y) ||
			cp.x === null ||
			cp.y === null)
	)
		return showMessage('error', 'Select a location before selecting a player');
	//get the current selected player button
	const sel = document.querySelector('.player-button[selected]');

	if (!e || !e.target) return;

	const b = e.target.closest('.player-button');
	if (b && b !== sel) {
		//deselect the current button
		if (sel) sel.removeAttribute('selected');
		if (possession) {
			b.setAttribute('selected', 'a');
		}
		updateCurrentPass({
			player: b.getAttribute('data-id') || 'unknown',
		});
	} else if (b === sel) {
		b.removeAttribute('selected');
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

//moves the disc in response to a state update.
const moveDisc = (e) => {
	const state = sh.getState();
	const r = field.getBoundingClientRect();
	const [fHeight, fWidth] = [r.height, r.width];
	const currentPass = e.detail?.currentPoint?.passes?.slice(-1).pop();
	if (!currentPass) return;
	let x, y;
	({ x, y } = currentPass);
	if (x === null || y === null || isNaN(x + y)) return;
	const format = e.detail.format;
	let pctX = Math.max(0, Math.min(1, x / (format.length + 2 * format.endzone)));
	let pctY = Math.max(0, Math.min(1, y / format.width));

	if (state.currentPoint.direction === -1) {
		pctX = 1 - pctX;
		pctY = 1 - pctY;
	}

	const newX = pctX * fWidth;
	const newY = pctY * fHeight;

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
	discLine.style.left = `${x0 - r.left}px`;
	discLine.style.top = `${y0 - r.top}px`;
	discLine.classList.remove('invisible');
};

//event fires when we move the disc around. On touchend or mouseup, we update the data.
const setDiscPosition = (e) => {
	const state = sh.getState();
	if (!state) return;

	//don't do anything if the disc isn't movable
	if (!disc || !state.discIn) return;

	//if we're not already moving, and we didn't click the field or disc or a position button, don't do anything.
	if (
		!moving &&
		e.target !== disc &&
		e.target !== field &&
		e.target.getAttribute('role') !== 'button'
	)
		return;

	//if we start moving the disc, set the flag "moving" to be true
	if (
		(e.type === 'mousedown' || e.type === 'touchstart') &&
		(e.target === disc || e.target === field)
	)
		moving = true;
	//if we're not moving, and we didn't get here by a button, get out.
	else if (!moving && e.target.getAttribute('role') !== 'button') return;

	let pageX, pageY;
	//figure out where on the page the click/move/touch is happening (or would've happened)
	if (
		(e.target.getAttribute('data-x') || e.target.getAttribute('data-y')) &&
		e.type === 'click'
	) {
		//we got here by clicking a positioning button - get the X and Y from the button attributes
		let [x, y] = [
			parseFloat(e.target.getAttribute('data-x')),
			parseFloat(e.target.getAttribute('data-y')),
		];
		let cp = {
			x: undefined,
			y: undefined,
		};
		if (x === null || y === null || isNaN(x) || isNaN(y)) {
			for (var i = state.currentPoint.passes.length - 1; i >= 0; i--) {
				const p = state.currentPoint.passes[i];
				if (!isNaN(p.x) && !isNaN(p.y) && p.x !== null && p.y !== null) {
					cp = p;
					break;
				}
			}
		}
		[pageX, pageY] = getPageCoordinates(
			isNaN(x) || x === null ? cp.x : x,
			isNaN(y) || y === null ? cp.y : y
		);
	} else if (isMobile) {
		//if we are on mobile and it's a touchend event, the location is the changed touch
		if (e.type === 'touchend') {
			({ pageX, pageY } = e.changedTouches[0]);
		} else if (e.type === 'touchmove') {
			//if we're on mobile and it's a touchmove or touchstart event, it's the first target touch
			({ pageX, pageY } = e.targetTouches[0]);
		} else if (
			e.type === 'touchstart' &&
			(e.target === disc || e.target === field)
		) {
			({ pageX, pageY } = e.targetTouches[0]);
		}
	} else if (
		e.type === 'mousedown' &&
		(e.target === disc || e.target === field)
	) {
		//if not mobile, it's just the pageX and pageY from the mouse event
		({ pageX, pageY } = e);
	} else if (e.type === 'mousemove' || e.type === 'mouseup') {
		({ pageX, pageY } = e);
	}
	//don't do anything if we do a touchend or mouseup.
	else if (e.type !== 'touchend' && e.type !== 'mouseup') return;

	//draw the disc
	if (
		moving ||
		(e.target.classList.contains('dropdown-item') &&
			e.target.getAttribute('role') === 'button' &&
			e.type === 'click')
	) {
		drawDisc(pageX, pageY);
		//if we have possession...
		if (state.currentPoint.possession) {
			//and the last touch is also us on offense
			let lastTouch;
			for (var i = state.currentPoint.passes.length - 1; i >= 0; i--) {
				const p = state.currentPoint.passes[i];
				if (!p.offense) break;
				if (
					p.player &&
					!isNaN(p.x) &&
					!isNaN(p.y) &&
					p.x !== null &&
					p.y !== null &&
					p.result === 'complete'
				) {
					lastTouch = p;
					break;
				}
			}
			if (lastTouch) {
				//draw the line showing the pass
				let [x0, y0] = getPageCoordinates(
					Math.min(lastTouch.x, state.format.endzone + state.format.length),
					lastTouch.y
				);
				drawLine(x0, y0, pageX, pageY);
			}
		}
	} else return;

	if (
		e.type === 'touchend' ||
		e.type === 'mouseup' ||
		(e.target.classList.contains('dropdown-item') &&
			e.target.getAttribute('role') === 'button')
	) {
		const [x, y] = getYards(pageX, pageY);
		updateCurrentPass({ x, y });
		moving = false;
	}
};

const addPlayerButton = (p, color) => {
	if (!buttonRowContainer) return;

	//create the button
	const b = createElement(
		`button.player-button.${color}.d-flex.flex-column.align-items-center[data-id="${
			p ? p.id : 'Unknown'
		}"][data-name="${p ? p.firstName : 'Unknown'}"][title="${
			p ? p.id : 'Unknown'
		}"]`
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

const nameSort = (a, b) => {
	if (!a.lastName) return 1;
	if (!b.lastName) return -1;

	if (a.lastName.toLowerCase().trim() !== b.lastName.toLowerCase().trim())
		return a.lastName.localeCompare(b.lastName);
	else if (!a.firstName) return 1;
	else if (!b.firstName) return -1;
	else return a.firstName.localeCompare(b.firstName);
};

const handleLoadPoint = (e) => {
	if (!sh) sh = new StateHandler({ ...e.detail, poppedPasses: [] });
	else sh.setState({ ...e.detail, poppedPasses: [] });
	console.log(e.detail);
	const state = sh.getState();
	if (state.currentPoint) {
		if (!state.discIn) state.discIn = true;

		state.currentPoint.possession = state.currentPoint.offense;
		initialLength = state.currentPoint.passes.length;
		state.currentPoint.passes.forEach((p) => {
			if (p.turnover)
				state.currentPoint.possession = !state.currentPoint.possession;
			p.x = isNaN(p.x) || p.x === null ? undefined : parseFloat(p.x);
			p.y = isNaN(p.y) || p.x === null ? undefined : parseFloat(p.y);
		});

		sh.setState(state);
		if (state.currentPoint.scored !== 1 && state.currentPoint.scored !== -1) {
			showDiv(actionArea);
		}
	}
};

const displayPossession = (state) => {
	if (!state || !state.currentPoint) return;
	const passes = state.currentPoint.passes;
	if (!passes) return;
	//display the arrow
	teamDirection.classList.remove('left', 'right');
	oppDirection.classList.remove('left', 'right');
	//no passes - set possession based on who is receiving the pull
	if (passes.length === 0) {
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
	else if (passes.slice(-1).pop().offense) {
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
	if (playerRemoved || playerAdded) {
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
	}

	deselectAll();

	let passes = e.detail.currentPoint?.passes;
	if (!passes || !Array.isArray(passes) || passes.length < 2) return;
	passes = passes.filter((p) => {
		return p.event === '';
	});

	if (passes.length < 2) return;
	passes = passes.slice(-2);

	if (passes[0].result === 'complete' && passes[1].offense) {
		getElementArray(document, '.player-button').forEach((b) => {
			if (passes[0].player === b.getAttribute('data-id'))
				b.setAttribute('selected', '');
			else b.removeAttribute('selected');
		});
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
	if (!state.currentPoint) return;

	//if we're on defense, all 3 events are possible for the other team
	if (!state.currentPoint.possession) {
		drop.disabled = false;
		throwaway.disabled = false;
		goal.disabled = false;
		return;
	}

	if (state.currentPoint.passes.length < 2) return;

	const passes = state.currentPoint.passes.slice(-2);
	//we're on offense
	if (passes[0].result === 'complete') {
		//drop button - we need a "completed" pass to mark as actually a drop
		drop.disabled = false;
		//goal button - we need a "completed" pass in the end zone.
		if (passes[0].x >= state.format.endzone + state.format.length)
			goal.disabled = false;
	}
	//we just got a D in the attacking endzone - enable the possibility of a callahan
	else if (passes[0].result === 'block' && !passes[0].offense) {
		if (passes[0].x >= state.format.endzone + state.format.length)
			goal.disabled = false;
	}

	//throwaway button - we need a player on the previous pass, and a location
	if (
		passes[0].player &&
		passes[1].x !== null &&
		passes[1].y !== null &&
		!isNaN(passes[1].x) &&
		!isNaN(passes[1].y)
	)
		throwaway.disabled = false;
};

//TODO: handle subs
const handleEventMenu = (state) => {
	ourTimeout.disabled = true;
	theirTimeout.disabled = true;
	sub.disabled = false;

	const passes = state?.currentPoint?.passes;
	if (Array.isArray(passes)) {
		const onlyPasses = passes.filter((p) => {
			return p.event === '';
		});
		console.log(onlyPasses);
		if (
			onlyPasses.length === 0 ||
			(onlyPasses.length === 1 &&
				(!onlyPasses[0].player ||
					isNaN(parseFloat(onlyPasses[0].x + onlyPasses[0].y))))
		) {
			ourTimeout.disabled = state.timeoutsLeft[0] === 0;
			theirTimeout.disabled = state.timeoutsLeft[1] === 0;
		} else if (onlyPasses.slice(-1).pop().offense) ourTimeout.disabled = false;
		else theirTimeout.disabled = false;
	}

	// if (state && state.currentPoint && state.currentPoint.scored === 0)
	// 	sub.disabled = false;
};

const createSubOption = (p, i) => {
	const toReturn = createElement(
		`.sub-option.d-flex.m-1[data-id="${p.id}"][data-gender="${p.gender}"][data-line="${p.line}"][data-position="${p.position}"]`
	);
	const r = createElement(`input#sub-${p.id}.mx-1`);
	r.setAttribute('type', 'radio');
	r.setAttribute('name', `${i ? 'player-out' : 'player-in'}`);
	r.addEventListener('change', handleSubFilter);
	const l = createElement(`label`);
	l.setAttribute('for', `sub-${p.id}`);
	l.innerHTML = `${p.lastName}, ${p.firstName} (${p.gender}/${p.line}/${p.position})`;
	toReturn.appendChild(r);
	toReturn.appendChild(l);
	return toReturn;
};

const setSubs = (state) => {
	if (!state || !state.currentPoint || !state.roster) return;

	const r = state.roster.sort(nameSort);

	r.forEach((p) => {
		let op = document.querySelector(`.sub-option[data-id="${p.id}"]`);
		if (!op) {
			if (state.currentPoint.lineup.includes(p.id)) {
				op = createSubOption(p, true);
				console.log(p);
			} else op = createSubOption(p, false);
		}
		if (state.currentPoint.lineup.includes(p.id)) {
			op.querySelector('input').setAttribute('name', 'player-out');
			playerOut.appendChild(op);
		} else {
			op.querySelector('input').setAttribute('name', 'player-in');
			playerIn.appendChild(op);
		}
	});
};

const handleSubFilter = (e) => {
	// playerIn.classList.remove(
	// 	'male',
	// 	'female',
	// 	'defense',
	// 	'offense',
	// 	'handler',
	// 	'cutter',
	// 	'hybrid'
	// );
	playerIn.classList.add('male', 'female');

	const s = e?.target?.closest('.sub-option');
	if (!s) return;

	if (s.getAttribute('data-gender') === 'M')
		playerIn.classList.remove('female');
	else if (s.getAttribute('data-gender') === 'F')
		playerIn.classList.remove('male');

	const selectedSub = playerIn.querySelector('input[type="radio"]:checked');
	if (selectedSub) {
		const op = selectedSub.closest('.sub-option');
		if (op.getAttribute('data-gender') !== s.getAttribute('data-gender'))
			selectedSub.checked = false;
	}
};

const handleSub = (e) => {
	e.preventDefault();
	const pOut = document
		.querySelector(`input[name="player-out"]:checked`)
		?.closest('.sub-option');
	const pIn = document
		.querySelector(`input[name="player-in"]:checked`)
		?.closest('.sub-option');

	const state = sh.getState();
	console.log(state);
	if (!state) return;

	if (!pOut && !pIn)
		return showMessage(
			'error',
			'You must select a player to enter or exit the game.'
		);
	if (state.currentPoint.lineup.length === state.format.players && !pOut)
		return showMessage('error', 'You must select a player to exit the game.');
	let status = 'info';
	if (!pIn) status = 'warning';

	const playerIn = pIn
		? state.roster.find((p) => {
				return p.id === pIn.getAttribute('data-id');
		  })
		: undefined;
	const playerOut = pOut
		? state.roster.find((p) => {
				return p.id === pOut.getAttribute('data-id');
		  })
		: undefined;

	console.log(pIn, pOut, playerIn, playerOut);

	if (state.division === 'Mixed') {
		if (playerIn.gender !== playerOut.gender)
			return showMessage(
				'error',
				'Swapped players must be of same gender-matchup.'
			);
	}

	let message;

	if (playerIn && playerOut)
		message = `${playerIn.lastName}, ${playerIn.firstName} entered the game for ${playerOut.lastName}, ${playerOut.firstName}`;
	else if (playerIn)
		message = `${playerIn.lastName}, ${playerIn.firstName} entered the game`;
	else if (playerOut)
		message = `${playerOut.lastName}, ${playerOut.firstName} subbed out`;

	const str = `/api/v1/games/subPlayer/${state._id}`;
	const body = {
		in: playerIn?.id,
		out: playerOut?.id,
	};
	const handler = (res) => {
		if (res.status === 'success') {
			sh.setState({
				...state,
				points: res.data.points,
				currentPoint: {
					...state.currentPoint,
					lineup: res.data.points.slice(-1).pop().lineup,
					injuries: res.data.points.slice(-1).pop().injuries,
				},
			});
			subModal.hide();
			return showMessage(status, message);
		} else {
			return showMessage('error', res.message);
		}
	};
	handleRequest(str, 'PATCH', body, handler);
};

const handleClearSubs = (e) => {
	const pOut = document.querySelector(`input[name="player-out"]:checked`);
	const pIn = document.querySelector(`input[name="player-in"]:checked`);

	if (pOut) pOut.checked = false;
	if (pIn) pIn.checked = false;

	handleSubFilter(null);
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

	subForm.addEventListener('submit', handleSub);
	clearSubs.addEventListener('click', handleClearSubs);

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

	sh.addWatcher(buttonRowContainer, handlePlayerButtons);
	sh.addWatcher(null, displayPossession);
	sh.addWatcher(lastEvent, displayEventDescription);
	sh.addWatcher(null, handleUndoRedoButtons);
	sh.addWatcher(null, handleResultButtons);
	sh.addWatcher(null, handleEventMenu);
	sh.addWatcher(disc, moveDisc);
	sh.addWatcher(null, drawLastPass);
	sh.addWatcher(null, setSubs);
	window.addEventListener('beforeunload', (e) => {
		e.preventDefault();
		// updatePasses();
	});
});
