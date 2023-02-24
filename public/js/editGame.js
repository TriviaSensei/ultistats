const field = document.querySelector('#field-canvas');

function toNearestHalf(n) {
	return parseFloat((Math.round(n + 0.5) - 0.5).toFixed(1));
}

document.addEventListener('DOMContentLoaded', () => {
	const rect = field.getBoundingClientRect();
	console.log(rect);
});
