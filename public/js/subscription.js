import { createElement } from './utils/createElementFromSelector.js';
import { getElementArray } from './utils/getElementArray.js';
import { showMessage } from './utils/messages.js';
import { handleRequest } from './utils/requestHandler.js';

const expires = document.querySelector('#current-membership-expires');
const memLevel = document.querySelector('#current-membership');
const memArea = document.querySelector('#membership-area');
const checkoutForm = document.querySelector('#membership-form');
const memEnd = document.querySelector('#mem-end');
const memSelect = document.querySelector('#select-mem-type');
const selectUpgrade = document.querySelector('#select-upgrade');
const pricePreview = document.querySelector('#total-cost');
const renewRow = document.querySelector('#renew-row');
const renewSelect = document.querySelector('#select-recurrence');
const renewalPreview = document.querySelector('#renewal-cost');
const memCheckout = document.querySelector('#checkout');
const cancelLink = document.querySelector('#cancel-membership-link');
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
	//try to find the current membership
	if (
		!e.detail.subscriptions.some((s) => {
			const sd = Date.parse(s.startDate);
			const ed = Date.parse(s.endDate);
			const now = Date.parse(new Date());

			//if we have a current membership, populate it
			if (now < ed && now >= sd) {
				currentMembership = s;
				memLevel.innerHTML = s.type;
				const d = new Date(ed);
				let expDate = d.toLocaleDateString();
				if (d.getFullYear > 9000) expDate = 'Never';
				else {
					const timeLeft = (ed - now) / (1000 * 60 * 60 * 24);
					if (timeLeft <= 1) {
						expDate = `${expDate} (< 1 day)`;
					} else if (timeLeft <= 30) {
						expDate = `${expDate} (${Math.floor(timeLeft)} days)`;
					}
				}
				expires.innerHTML = expDate;
				if (s.autoRenew) {
					memEnd.innerHTML = 'Renews:';
				} else {
					memEnd.innerHTML = 'Expires:';
				}
				return true;
			}
		})
	) {
		currentMembership = undefined;
		memLevel.innerHTML = 'Free';
		memEnd.innerHTML = 'Expires';
		expires.innerHTML = 'Never';
	}

	if (!currentMembership) {
		selectUpgrade.classList.add('invisible-div');
	}

	// if (
	// 	e.detail.availableMemberships.length > 0 && //at least one membership available
	// 	(e.detail.availableMemberships.length > 1 || e.detail.type !== 'sub') && //we don't have a recurring highest membership
	// 	(d.getFullYear() <= 9000 || e.detail.subscription === 'Free') //the membership will expire, or it's the free membership
	// ) {
	// 	//show the checkout form
	// 	const opts = getElementArray(memSelect, 'option');
	// 	opts.forEach((o) => {
	// 		o.remove();
	// 	});
	// 	e.detail.availableMemberships.forEach((a) => {
	// 		const opt = createElement('option');
	// 		opt.setAttribute('value', a.name);
	// 		opt.innerHTML = `${a.name} - $${a.cost}/year`;
	// 		memSelect.appendChild(opt);
	// 	});
	// 	if (memSelect) memSelect.selectedIndex = 0;
	// 	checkoutForm.classList.remove('invisible-div');
	// }

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
		`.selection-container:not(.invisible-div) input[type="radio"]:checked`
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
	const renew = checkoutForm.querySelector(
		`input[type="radio"][name="renew"]:checked`
	)?.value;
	if (renew === 'yes') {
		renewRow.classList.remove('invisible-div');
		const basePrice = checkoutForm
			.querySelector('input[type="radio"][name="mem-type"]:checked')
			?.getAttribute('data-price');
		if (basePrice) {
			const c = (parseInt(basePrice) / 100) * 0.9;
			renewalPreview.innerHTML = `$${c.toFixed(2)}/year until cancelled`;
		}
	} else {
		renewalPreview.innerHTML = `N/A`;
	}
};

document.addEventListener('DOMContentLoaded', () => {
	document.addEventListener('set-sub-level', handleSubscriptionArea);
	featureToggle.addEventListener('click', handleFeatureToggle);

	getElementArray(memArea, 'input[type="radio"]').forEach((r) => {
		r.addEventListener('change', handlePrices);
	});
});
