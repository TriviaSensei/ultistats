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
	timeouts: undefined,
	period: undefined,
	team: undefined,
	opponent: undefined,
	result: undefined,
	score: 0,
	oppScore: 0,
	currentPoint: {
		score: undefined,
		oppScore: undefined,
		offense: undefined,
		direction: undefined,
		scored: undefined,
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

const populatePointStart = (dir, off) => {
	const r = document.querySelector(
		`input[name="attack-direction"][value="${dir}"]`
	);
	if (r) r.checked = true;

	const o = document.querySelector(`input[name="od"][value="${off}"]`);
	if (o) o.checked = true;
};

const handleSettings = (e) => {
	if (e.target !== settingsForm) return;
	e.preventDefault();

	const settings = {
		offense: document.querySelector(
			`input[type="radio"][name="start-on"]:checked`
		)?.value,
		genderRatio: document.querySelector(
			`input[type="radio"][name="start-gender"]:checked`
		)?.value,
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
			if (gameData.currentPoint.direction === undefined)
				populatePointStart(settings.direction, settings.offense);

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
			settingsForm.querySelector(`input[name="start-gender"]:checked`)) &&
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

	//get the gender fule, team names, and game ID for calling the API
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
	console.log(settings);
	gameData.startSettings = {
		...settings,
		direction: parseInt(settings.direction),
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
		!gameData.startSettings.offense === undefined ||
		(!gameData.startSettings.genderRatio && gameData.division === 'Mixed') ||
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
		if (gameData.currentPoint.direction === undefined)
			populatePointStart(
				gameData.startSettings.direction,
				gameData.startSettings.offense
			);
		else {
			//at least one point has been played. Check if the last point ended a period
			if (gameData.currentPoint.endPeriod) {
				const newPeriod = gameData.currentPoint.period + 1;
				if (newPeriod % 4 === 2 || newPeriod % 4 === 3) {
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
	settingsForm.addEventListener('submit', handleSettings);
});
