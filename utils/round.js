module.exports = (number, places) => {
	if (isNaN(number) || number === null || number === undefined)
		return undefined;
	if ((typeof places).toLowerCase() !== 'number') return undefined;
	if (places !== Math.round(places) || places <= 0) return undefined;

	return Math.round(number * Math.pow(10, places)) / Math.pow(10, places);
};
