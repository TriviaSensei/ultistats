export const populateForm = (form, obj) => {
	Object.keys(obj).forEach((k) => {
		const inp = form.querySelector(`[data-field="${k}"]`);
		if (inp) inp.value = obj[k];
	});
};
