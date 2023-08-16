import { createElement } from './utils/createElementFromSelector.js';
import { getElementArray } from './utils/getElementArray.js';
import { showMessage } from './utils/messages.js';
import { handleRequest } from './utils/requestHandler.js';

const teamSelect = document.querySelector('#team-select');

const expires = document.querySelector('#current-membership-expires');
const memLevel = document.querySelector('#current-membership');
const memArea = document.querySelector('#membership-area');
const memEnd = document.querySelector('#mem-end');
const manager = document.querySelector('#current-manager');
const memCheckout = document.querySelector('#checkout');
const featureToggle = document.querySelector('#feature-toggle');

let currentMembership;

const tooltipTriggerList = document.querySelectorAll(
	'[data-bs-toggle="tooltip"]'
);
const tooltipList = [...tooltipTriggerList].map(
	(tooltipTriggerEl) => new bootstrap.Tooltip(tooltipTriggerEl)
);

/**
 * What the user sees here is a function of the current membership type, and whether it auto-renews
 *
 * Renew options -
 *
 * Current membership       User sees
 * --------------------------------------------------------------
 * Free                     All membership options
 * Plus                     Ability to cancel
 */
const handleSubscriptionArea = (e) => {
	currentMembership = e.detail.subscription;

	//try to find the current membership
	//no subscription - show every option
	if (!e.detail.subscription) {
		currentMembership = undefined;
		memLevel.innerHTML = 'Free';
		memEnd.innerHTML = 'Expires';
		expires.innerHTML = 'Never';
		manager.innerHTML = 'N/A';
	} else {
		memLevel.innerHTML = currentMembership.name;
		memEnd.innerHTML = 'Renews';
		manager.innerHTML = e.detail.isMe ? 'Me' : e.detail.currentManager;
		const newDate = new Date(Date.parse(currentMembership.createdAt));
		newDate.setFullYear(newDate.getFullYear() + 1);
		expires.innerHTML = newDate.toLocaleDateString();
		//right now, everything is showing.
	}

	if (!currentMembership) {
		memCheckout.classList.remove('d-none');
		memCheckout.innerHTML = `Upgrade ($20.00)`;
	} else if (!e.detail.isMe) memCheckout.classList.add('d-none');
	else {
		memCheckout.classList.remove('d-none');
		memCheckout.innerHTML = `Cancel`;
		memCheckout.setAttribute('data-id', currentMembership.subscriptionId);
	}
};

const handleFeatureToggle = (e) => {
	if (e.target.getAttribute('aria-expanded').toString() === 'true')
		e.target.innerHTML = 'Hide features';
	else e.target.innerHTML = 'Show features';
};

const handleCheckout = (e) => {
	if (e.target !== memCheckout) return;
	e.preventDefault();
	if (!teamSelect.value) return;

	const str = `/api/v1/subscriptions/create-checkout-session/${teamSelect.value}`;
	const body = {
		product: memCheckout.getAttribute('data-value'),
	};
	const handler = (res) => {
		if (res.status === 'success') {
			location.href = res.data.url;
		} else {
			showMessage('error', res.message);
		}
	};
	handleRequest(str, 'POST', body, handler);
};

document.addEventListener('DOMContentLoaded', () => {
	document.addEventListener('set-sub-level', handleSubscriptionArea);
	featureToggle.addEventListener('click', handleFeatureToggle);

	getElementArray(memArea, 'input[type="radio"]').forEach((r) => {
		r.addEventListener('change', handlePrices);
	});

	memCheckout.addEventListener('click', handleCheckout);
});
