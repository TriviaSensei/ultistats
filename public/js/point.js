import { showMessage } from './utils/messages.js';
import { handleRequest } from './utils/requestHandler.js';
import { createElement } from './utils/createElementFromSelector.js';
import { getElementArray } from './utils/getElementArray.js';

const field = document.querySelector('#field-canvas');
const lastEvent = document.querySelector('#event-desc');

const showEvent = (msg) => {
	lastEvent.innerHTML = msg;
};

const handleStartPoint = (e) => {
	console.log(e.detail);
};

document.addEventListener('DOMContentLoaded', () => {
	document.addEventListener('new-point', handleStartPoint);
});
