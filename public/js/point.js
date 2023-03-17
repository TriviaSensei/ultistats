import { showMessage } from './utils/messages.js';
import { handleRequest } from './utils/requestHandler.js';
import { createElement } from './utils/createElementFromSelector.js';
import { getElementArray } from './utils/getElementArray.js';

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

//positioning buttons
const brick = document.querySelector('#brick');
const ownGoal = document.querySelector('#own-goal');
const attackingGoal = document.querySelector('#attack-goal');
const revBrick = document.querySelector('#reverse-brick');
const midfield = document.querySelector('#midfield');
const centerDisc = document.querySelector('#center');

let discIn = false;
let moving = false;
let gameData;
let roster;

let currentPoint;
let currentPass;
let poppedPasses = [];

const getYards = (pageX, pageY) => {
	const r = field.getBoundingClientRect();
	let pctX = (pageX - r.left) / r.width;
	let pctY = (pageY - r.top) / r.height;

	if (currentPoint.direction === -1) {
		pctX = 1 - pctX;
		pctY = 1 - pctY;
	}

	return [
		pctX * (gameData.length + 2 * gameData.endzone),
		pctY * gameData.width,
	];
};

const deselectAll = () => {
	getElementArray(document, 'button[selected]').forEach((b) => {
		b.removeAttribute('selected');
	});
};

const getFieldCoordinates = (x, y) => {
	const r = field.getBoundingClientRect();
	let pctX = x / (gameData.length + 2 * gameData.endzone);
	let pctY = y / gameData.width;
	if (currentPoint.direction === -1) {
		pctX = 1 - pctX;
		pctY = 1 - pctY;
	}

	return [pctX * r.width + r.left, pctY * r.height + r.top];
};

const resetCurrentPass = () => {
	currentPass = {
		thrower: '',
		receiver: '',
		defender: '',
		x0: undefined,
		y0: undefined,
		x1: undefined,
		y1: undefined,
		result: '',
		turnover: false,
		goal: 0,
		description: '',
		event: undefined,
		eventDesc: {
			name: '',
			in: '',
			out: '',
		},
	};

	return currentPass;
};

const handleEvent = (e) => {
	if (
		currentPoint.possession &&
		!currentPass.receiver &&
		!currentPass.thrower
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
		case 'timeout':
			updateCurrentPass({
				event: eventName,
			});
			break;
		default:
			return;
	}
};

const getPlace = (yds) => {
	yds = Math.round(yds);
	switch (true) {
		case yds <= -2:
			return `${Math.abs(yds)} yards inside the endzone`;
		case yds === -1:
			return `1 yard inside the endzone`;
		case yds === 0:
			return `on the goal line`;
		case yds < gameData.length / 2:
			return `on the ${yds}-yard line`;
		case yds === gameData.length / 2:
			return `at midfield`;
		case yds < gameData.length:
			return `on the opposing ${gameData.length - yds}-yard line`;
		case yds === gameData.length:
			return `on the opposing goal line`;
		default:
			return `in the opposing endzone`;
	}
};

const addPass = () => {
	currentPoint.passes.push(currentPass);
	const d = {
		thrower: currentPass.receiver,
		x0: currentPass.x1,
		y0: currentPass.y1,
	};
	undo.disabled = false;
	redo.disabled = true;
	poppedPasses = [];
	resetCurrentPass();
	updateCurrentPass(d);
};

const drawPass = (p) => {
	const [x0, y0] = getFieldCoordinates(p.x0, p.y0);
	const [x1, y1] = getFieldCoordinates(p.x1, p.y1);
	drawDisc(x1, y1);
	drawLine(x0, y0, x1, y1);
	showEvent(p.description);

	deselectAll();
	const b = document.querySelector(`.player-button[data-id="${p.receiver}"]`);
	if (b) b.setAttribute('selected', '');
};

const undoPass = (e) => {
	if (e.target !== undo) return;
	if (currentPoint.passes.length === 0) return;

	const lastPass = currentPoint.passes.pop();
	poppedPasses.push(lastPass);
	redo.disabled = false;

	if (lastPass.turnover || lastPass.goal !== 0) changePossession();
	if (lastPass.goal === -1) {
		gameData.oppScore--;
		theirScore.innerHTML = gameData.oppScore;
	} else if (lastPass.goal === 1) {
		gameData.score--;
		ourScore.innerHTML = gameData.score;
	}
	if (currentPoint.passes.length > 0) {
		const newCurrentPass = currentPoint.passes[currentPoint.passes.length - 1];
		drawPass(newCurrentPass);
		resetCurrentPass();
		currentPass = {
			...currentPass,
			thrower: lastPass.thrower,
			receiver: '',
			x0: lastPass.x0,
			y0: lastPass.y0,
		};
	} else {
		if (currentPoint.offense)
			showEvent(`${gameData.opponent} pulls to ${gameData.team}`);
		else showEvent(`${gameData.team} pulls to ${gameData.opponent}`);

		resetCurrentPass();
		deselectAll();
		currentPass = {
			...currentPass,
			x1: lastPass.x1,
			y1: lastPass.y1,
		};
	}

	discIn = true;
};

const redoPass = (e) => {
	if (e.target !== redo) return;
	if (poppedPasses.length === 0) return;

	const toRedo = poppedPasses.pop();
	if (!toRedo) return;

	if (poppedPasses.length === 0) redo.disabled = true;
	currentPoint.passes.push(toRedo);
	undo.disabled = false;

	resetCurrentPass();
	currentPass = {
		...currentPass,
		x0: toRedo.x1,
		y0: toRedo.y1,
		thrower: toRedo.receiver,
	};

	drawPass(toRedo);
};

const addBlock = () => {
	currentPass.result = 'block';
	currentPoint.passes.push(currentPass);
	resetCurrentPass();
	setPlayer(null);
};

const updateLastPass = (data) => {
	if (currentPoint.passes.length === 0) return;

	currentPoint.passes[currentPoint.passes.length - 1] = {
		...currentPoint.passes[currentPoint.passes.length - 1],
		...data,
	};

	return currentPoint.passes[currentPoint.passes.length - 1];
};

const updateCurrentPass = (data) => {
	if (data.x1) {
		data.x1 = Math.min(data.x1, gameData.length + gameData.endzone);
	}

	currentPass = {
		...currentPass,
		...data,
	};

	let thrower, receiver, defender, event;
	if (currentPass.receiver)
		receiver =
			roster.find((p) => {
				return p.id === currentPass.receiver;
			})?.firstName || 'Unknown';
	if (currentPass.thrower)
		thrower =
			roster.find((p) => {
				return p.id === currentPass.thrower;
			})?.firstName || 'Unknown';
	if (currentPass.defender)
		defender =
			roster.find((p) => {
				return p.id === currentPass.defender;
			})?.firstName || 'Unknown';

	//a receiver was selected, and has the disc, at a location on the field
	if (
		currentPass.receiver &&
		currentPass.x1 !== undefined &&
		currentPass.y1 !== undefined
	) {
		if (!currentPoint.possession) {
			showMessage('error', 'Invalid pass data - see log for details');
			return console.log(`Invalid pass: `, currentPass);
		}
		if (currentPoint.passes.length === 0) {
			//if it's first noted event of the point
			//we are picking up the pull
			const startYds = Math.round(currentPass.x1 - gameData.endzone);
			let place = getPlace(startYds);
			event = `${receiver} picked up the pull ${place}.`;
			currentPass.description = event;
			addPass();
		} else {
			//there are other events this point, and we are currently on offense.
			if (currentPass.x0 !== undefined) {
				//we are on offense and didn't throw it away
				//(a drop or an opposing D is different; will be handled elsewhere).
				//Assume it is a completion for now, but it could be a drop or a D

				//yardage gain/loss - only calculating gain/loss, not swings for now.
				//origin of pass can't be in the attacking endzone
				if (currentPass.x0 > gameData.length + gameData.endzone) {
					currentPass.x0 = gameData.length + gameData.endzone;
					updateLastPass({ x1: currentPass.x0 });
				}
				const dx = Math.round(currentPass.x1 - currentPass.x0);
				currentPass.result = 'complete';
				event = `${thrower} → ${receiver} (${dx >= 0 ? '+' : ''}${dx})`;
				currentPass.description = event;
				addPass();
			} else {
				//we are just picking up the disc after an opposing turn
				const startYds = Math.round(currentPass.x1 - gameData.endzone);
				let place = getPlace(startYds);
				event = `${receiver} picked up the disc ${place}.`;
				currentPass.description = event;
				addPass();
			}
		}
	} else if (currentPass.result) {
		//we got here by clicking a result button - stall, drop, throwaway, goal. Handle those things here.
		if (currentPoint.possession) {
			if (data.result === 'stall' && currentPass.thrower) {
				event = `${thrower} got stalled out.<br>${gameData.opponent} has the disc.`;
				currentPass.description = event;
				addPass();
				resetCurrentPass();
				setPlayer(null);
				changePossession();
			} else if (data.result === 'drop' && currentPass.thrower) {
				event = `${thrower} dropped the ${
					currentPoint.passes.length === 1 && currentPoint.offense
						? 'pull'
						: 'disc'
				}.<br>${gameData.opponent} has the disc.`;
				updateLastPass({ result: 'drop', turnover: true, description: event });
				resetCurrentPass();
				setPlayer(null);
				changePossession();
			} else if (
				currentPass.result === 'throwaway' &&
				currentPass.x1 !== undefined &&
				currentPass.y1 !== undefined
			) {
				event = `${thrower} threw the disc away.<br>${gameData.opponent} has the disc.`;
				currentPass.description = event;
				addPass();
				resetCurrentPass();
				setPlayer(null);
				changePossession();
			} else if (data.result === 'goal') {
				if (currentPass.x0 >= gameData.length + gameData.endzone) {
					event = `${thrower} scored!`;
					updateLastPass({
						goal: 1,
					});
					discIn = false;
					gameData.score++;
					ourScore.innerHTML = gameData.score;

					changePossession();
				} else {
					showMessage(
						'error',
						'The last pass was not into the endzone. Undo it and place it in the endzone.'
					);
				}
			}
			deselectAll();
		} else {
			if (data.result === 'stall') {
				event = `${gameData.opponent} got stalled out.<br>${gameData.team} to pick up the disc.`;
				currentPass.description = event;
				addPass();
				resetCurrentPass();
				setPlayer(null);
				changePossession();
			} else if (data.result === 'drop' || data.result === 'throwaway') {
				event =
					data.result === 'drop'
						? `${gameData.opponent} dropped the ${
								currentPoint.passes.length === 1 && currentPoint.offense
									? 'pull'
									: 'disc'
						  }<br>${gameData.team} to pick up the disc`
						: `${gameData.opponent} threw the disc away<br>${gameData.team} to pick up the disc`;
				updateLastPass({
					result: data.result,
					turnover: true,
					description: event,
				});
				resetCurrentPass();
				setPlayer(null);
				changePossession();
			} else if (data.result === 'goal') {
				event = `${gameData.opponent} scored!`;
				updateCurrentPass({
					goal: -1,
				});
				addPass();
				discIn = false;

				gameData.oppScore++;
				theirScore.innerHTML = gameData.oppScore;

				console.log(currentPoint.passes);

				changePossession();
			}
			deselectAll();
		}
	} else if (currentPass.defender) {
		//we are on D...possession SHOULD be false here
		if (currentPoint.possession) return;
		event = `${defender} got a block.<br>${gameData.team} to pick up the disc`;
		addBlock();
		changePossession();
		resetCurrentPass();
	}
	console.log(currentPass);

	if (event) showEvent(event);
};

const showEvent = (msg) => {
	lastEvent.innerHTML = msg;
};

const propCase = (str) => {
	if (!str) return str;

	return `${str.charAt(0).toUpperCase()}${str
		.substring(1, str.length)
		.toLowerCase()}`;
};

const setPlayer = (e) => {
	const sel = document.querySelector('.player-button[selected]');
	if (sel) sel.removeAttribute('selected');
	if (!e || !e.target) return;

	const b = e.target.closest('.player-button');
	if (b && b !== sel) {
		b.setAttribute('selected', '');
		if (currentPoint.possession)
			updateCurrentPass({
				receiver: b.getAttribute('data-id'),
			});
		else
			updateCurrentPass({
				defender: b.getAttribute('data-id'),
			});
	} else if (b === sel) {
		if (currentPoint.possession)
			updateCurrentPass({
				receiver: '',
			});
		else
			updateCurrentPass({
				defender: '',
			});
	}
};

//draw the disc at the location indicated - this will not update any game data.
const drawDisc = (pageX, pageY) => {
	const r = field.getBoundingClientRect();
	const [fTop, fLeft] = [r.top, r.left];
	const newX = Math.min(Math.max(0, pageX - fLeft), r.width);
	const newY = Math.min(Math.max(0, pageY - fTop), r.height);
	if (!isNaN(newX)) disc.style.left = `${newX}px`;
	if (!isNaN(newY)) disc.style.top = `${newY}px`;
};

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

const setDiscPosition = (e) => {
	if (!disc || !discIn) return;
	if (
		(e.type === 'mousedown' || e.type === 'touchstart') &&
		(e.target === disc || e.target === field)
	)
		moving = true;
	else if (!moving && e.target.getAttribute('role') !== 'button') return;

	let pageX, pageY;

	if (isMobile && (e.target === disc || e.target === field)) {
		if (e.type === 'touchend') {
			({ pageX, pageY } = e.changedTouches[0]);
		} else {
			({ pageX, pageY } = e.targetTouches[0]);
		}
	} else if (e.target === disc || e.target === field) {
		({ pageX, pageY } = e);
	} else if (
		(e.target.getAttribute('data-x') || e.target.getAttribute('data-y')) &&
		e.type === 'click'
	) {
		let [x1, y1] = [
			parseFloat(e.target.getAttribute('data-x')),
			parseFloat(e.target.getAttribute('data-y')),
		];

		[pageX, pageY] = getFieldCoordinates(x1, y1);
	} else if (e.type !== 'touchend' && e.type !== 'mouseup') return;

	if (
		moving ||
		(e.target.classList.contains('dropdown-item') &&
			e.target.getAttribute('role') === 'button')
	) {
		drawDisc(pageX, pageY);
		let [x0, y0] = getFieldCoordinates(
			Math.min(currentPass.x0, gameData.endzone + gameData.length),
			currentPass.y0
		);

		drawLine(x0, y0, pageX, pageY);
	}

	const [x1, y1] = getYards(pageX, pageY);
	if (
		e.type === 'touchend' ||
		e.type === 'mouseup' ||
		(e.target.classList.contains('dropdown-item') &&
			e.target.getAttribute('role') === 'button')
	) {
		updateCurrentPass({ x1, y1 });
		moving = false;
	}
};

const addPlayerButton = (p, color) => {
	if (!buttonRowContainer) return;
	let lastRow = buttonRowContainer.querySelector('.button-row:last-child');
	let count;
	if (lastRow) count = lastRow.querySelectorAll('.player-button').length;
	if (!lastRow || count >= 4) {
		lastRow = createElement('.button-row');
		buttonRowContainer.appendChild(lastRow);
	}

	//todo create the actual button and append it
	const b = createElement(
		`button.player-button.${color}.d-flex.flex-column.align-items-center`
	);

	const nm = createElement('.jersey-name');
	nm.innerHTML = p ? p.initials : '??';
	const num = createElement('.jersey-number');
	num.innerHTML = p ? p.number : 'XX';

	b.appendChild(nm);
	b.appendChild(num);
	b.setAttribute('data-id', p.id);
	b.setAttribute('data-name', p.firstName);
	b.addEventListener('click', setPlayer);
	lastRow.appendChild(b);
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
	gameData = e.detail;
	if (gameData.tournament && gameData.tournament.roster)
		roster = gameData.tournament.roster;

	//load player buttons
	let count = 0;

	const players = gameData.currentPoint.lineup
		.map((p) => {
			const r = roster.find((pl) => {
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

	players.forEach((p) => {
		if (p) addPlayerButton(p, gameData.startSettings.jersey);
	});
	if (count < gameData.players)
		addPlayerButton(null, gameData.startSettings.jersey);

	currentPoint = gameData.currentPoint;
	currentPoint.period = gameData.period;

	if (currentPoint.passes.length === 0) {
		//figure out who's pulling, and in what direction.
		let pt, rt, sp, cl;
		if (currentPoint.offense) {
			//they're pulling
			pt = gameData.opponent;
			rt = gameData.team;
			currentPoint.possession = true;
			sp = document.querySelector('#team-direction');
			if (currentPoint.direction === 1) {
				//we go right
				cl = 'right';
			} else {
				cl = 'left';
			}
		} else {
			//we're pulling
			rt = gameData.opponent;
			pt = gameData.team;
			currentPoint.possession = false;
			sp = document.querySelector('#opp-direction');
			if (currentPoint.direction === 1) {
				//they go left
				cl = 'left';
			} else {
				cl = 'right';
			}
		}
		sp.classList.add(cl);
		showEvent(`${pt} pulls to ${rt}`);
		resetCurrentPass();
	}

	discIn = true;
};

const changePossession = () => {
	//change the data
	currentPoint.possession = !currentPoint.possession;

	//display the arrow
	teamDirection.classList.remove('left', 'right');
	oppDirection.classList.remove('left', 'right');

	if (currentPoint.possession) {
		if (currentPoint.direction === 1) teamDirection.classList.add('right');
		else teamDirection.classList.add('left');
	} else {
		if (currentPoint.direction === 1) oppDirection.classList.add('left');
		else oppDirection.classList.add('right');
	}
};

document.addEventListener('DOMContentLoaded', () => {
	document.addEventListener('load-point', handleLoadPoint);
	field.addEventListener('click', setDiscPosition);
	disc.addEventListener('mousedown', setDiscPosition);
	field.addEventListener('mousedown', setDiscPosition);
	document.body.addEventListener('mouseup', setDiscPosition);
	document.body.addEventListener('mousemove', setDiscPosition);
	document.body.addEventListener('touchend', setDiscPosition);
	// for (const key in document.body) {
	// 	if (/^on/.test(key)) {
	// 		const eventType = key.substring(2);
	// 		document.body.addEventListener(eventType, (e) => {
	// 			console.log(e.type);
	// 		});
	// 	}
	// }

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
	const evArray = ['stall', 'drop', 'throwaway', 'goal', 'sub', 'timeout'];
	const events = (() => {
		let obj = {};
		evArray.forEach((a) => {
			const b = document.querySelector(`#${a}`);
			b.setAttribute('data-event', a);
			b.addEventListener('click', handleEvent);
			obj[a] = document.querySelector(`#${a}`);
		});
		return obj;
	})();

	undo.addEventListener('click', undoPass);
	redo.addEventListener('click', redoPass);
});
