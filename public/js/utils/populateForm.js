import { getElementArray } from './getElementArray.js';

export const populateForm = (form, obj) => {
	Object.keys(obj).forEach((k) => {
		let inp = form.querySelector(`[data-field="${k}"]`);
		if (!inp)
			inp = document.querySelector(
				`[form="${form.getAttribute('id')}"][data-field="${k}"]`
			);

		if (inp) {
			if (inp.tagName.toLowerCase() === 'input') inp.value = obj[k];
			else if (inp.tagName.toLowerCase() === 'select') {
				const options = getElementArray(inp, 'option');
				inp.selectedIndex = options.findIndex((o) => {
					return o.value.toString() === obj[k].toString();
				});
			}
		}
	});
};
