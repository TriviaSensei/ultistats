import { getElementArray } from './getElementArray.js';

let stripe;
const key = document.querySelector('#stripe-public-key');

document.addEventListener('DOMContentLoaded', () => {
	if (!key) return;
	stripe = Stripe(key.value);
	const elements = stripe.elements();
	const card = elements.create('card', null);
	card.mount('#card-element');
});
