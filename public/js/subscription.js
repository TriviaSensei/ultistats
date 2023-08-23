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
const cancelMem = document.querySelector('#cancel');
const confirmCancel = document.querySelector('#confirm-cancel-membership');
const reactivateMem = document.querySelector('#reactivate');
const confirmReactivate = document.querySelector(
	'#confirm-reactivate-membership'
);
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
		memEnd.innerHTML = currentMembership.active ? 'Renews' : 'Expires';
		manager.innerHTML = e.detail.isMe ? 'Me' : e.detail.currentManager;
		const newDate = new Date(Date.parse(currentMembership.expires));
		newDate.setFullYear(new Date().getFullYear());
		if (newDate < Date.now()) newDate.setFullYear(new Date().getFullYear() + 1);
		expires.innerHTML = newDate.toLocaleDateString();
		//right now, everything is showing.
	}

	if (!currentMembership) {
		//no current membership
		//show the checkout/upgrade button, hide the cancel button
		memCheckout.classList.remove('d-none');
		cancelMem.classList.add('d-none');
		reactivateMem.classList.add('d-none');
	} else if (!e.detail.isMe) {
		//currentMembership, but not managed by me
		memCheckout.classList.add('d-none');
		cancelMem.classList.add('d-none');
		reactivateMem.classList.add('d-none');
	} else if (!currentMembership.active) {
		//current membership managed by me, but not active
		memCheckout.classList.add('d-none');
		cancelMem.classList.add('d-none');
		reactivateMem.classList.remove('d-none');
		reactivateMem.setAttribute('data-id', currentMembership.subscriptionId);
	} else {
		//current active membership
		memCheckout.classList.add('d-none');
		cancelMem.classList.remove('d-none');
		reactivateMem.classList.add('d-none');
		reactivateMem.setAttribute('data-id', '');
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

const handleCancel = (e) => {
	if (e.target !== confirmCancel) return;
	e.preventDefault();
	if (!teamSelect.value) return;

	const str = `/api/v1/subscriptions/cancel/${teamSelect.value}`;
	const handler = (res) => {
		showMessage(res.status === 'success' ? 'info' : 'error', res.message, 2000);
		if (res.status === 'success')
			handleSubscriptionArea({
				detail: { subscription: res.data, isMe: true },
			});
	};
	handleRequest(str, 'PATCH', null, handler);
};

const handleReactivate = (e) => {
	if (e.target !== confirmReactivate) return;
	e.preventDefault();

	const str = `/api/v1/subscriptions/reactivate/${teamSelect.value}`;
	const handler = (res) => {
		showMessage(res.status === 'success' ? 'info' : 'error', res.message, 2000);
		if (res.status === 'success')
			handleSubscriptionArea({
				detail: { subscription: res.data, isMe: true },
			});
	};
	handleRequest(str, 'PATCH', null, handler);
};

document.addEventListener('DOMContentLoaded', () => {
	document.addEventListener('set-sub-level', handleSubscriptionArea);
	featureToggle.addEventListener('click', handleFeatureToggle);

	getElementArray(memArea, 'input[type="radio"]').forEach((r) => {
		r.addEventListener('change', handlePrices);
	});

	memCheckout.addEventListener('click', handleCheckout);
	confirmCancel.addEventListener('click', handleCancel);
	confirmReactivate.addEventListener('click', handleReactivate);
});
