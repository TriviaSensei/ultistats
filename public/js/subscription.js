import { createElement } from './utils/createElementFromSelector.js';
import { getElementArray } from './utils/getElementArray.js';
import { showMessage } from './utils/messages.js';
import { handleRequest } from './utils/requestHandler.js';

const teamSelect = document.querySelector('#team-select');

const expires = document.querySelector('#current-membership-expires');
const memLevel = document.querySelector('#current-membership');
const memArea = document.querySelector('#membership-area');
const checkoutForm = document.querySelector('#membership-form');
const memEnd = document.querySelector('#mem-end');
const manager = document.querySelector('#current-manager');
const memSelect = document.querySelector('#select-mem-type');
const pricePreview = document.querySelector('#total-cost');
const renewRow = document.querySelector('#renew-row');
const renewalPreview = document.querySelector('#renewal-cost');
const memCheckout = document.querySelector('#checkout');
const toggleRenew = document.querySelector('#toggle-renew-button');
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
 * Current membership       Auto-renew?         User sees
 * --------------------------------------------------------------
 * Free                     N/A                 All membership options, all renew options
 * Basic                    No                  All membership options, all renew options, option to turn on auto-renew
 * Basic                    Yes                 Plus membership only, all renew options, option to turn off auto-renew
 * Plus                     No                  Plus membership only, all renew options, option to turn on auto-renew
 * Plus                     Yes                 Only option to turn on auto-renew
 */
const handleSubscriptionArea = (e) => {
	console.log(e.detail);
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
		const newDate = new Date(Date.parse(currentMembership.createdAt));
		newDate.setFullYear(newDate.getFullYear() + 1);
		expires.innerHTML = newDate.toLocaleDateString();

		//right now, everything is showing.
	}

	console.log(e.detail.isMe, currentMembership);
	if (!e.detail.isMe && currentMembership) {
		memArea.classList.add('d-none');
	} else {
		memArea.classList.remove('d-none');
	}

	handlePrices(null);
};

const handleFeatureToggle = (e) => {
	if (e.target.getAttribute('aria-expanded').toString() === 'true')
		e.target.innerHTML = 'Hide features';
	else e.target.innerHTML = 'Show features';
};

const handlePrices = (e) => {
	const selected = getElementArray(
		checkoutForm,
		`.selection-container:not(.d-none) input[type="radio"]:checked`
	);

	//membership, and upgrade current if applicable
	let cost = 0;
	selected.forEach((s) => {
		const c = s.getAttribute('data-price');
		if (c) {
			let price = parseInt(c) / 100;
			if (!isNaN(price)) cost = cost + price;
		}
	});
	pricePreview.innerHTML = cost.toFixed(2);

	//auto-renew

	const basePrice = checkoutForm
		.querySelector('input[type="radio"][name="mem-type"]:checked')
		?.getAttribute('data-price');
	if (basePrice) {
		const c = (parseInt(basePrice) / 100) * 0.9;
		renewalPreview.innerHTML = `$${c.toFixed(2)}/year until cancelled`;
	}
};

const handleCheckout = (e) => {
	if (e.target !== checkoutForm) return;
	e.preventDefault();
	if (!teamSelect.value) return;

	const str = `/api/v1/subscriptions/create-checkout-session/${teamSelect.value}`;
	const body = {
		product: checkoutForm.querySelector(
			`input[type="radio"][name="mem-type"]:checked`
		).value,
		upgradeExisting:
			checkoutForm.querySelector(
				`input[type="radio"][name="upgrade-existing"]:checked`
			)?.value === 'yes',
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

	checkoutForm.addEventListener('submit', handleCheckout);
});
