export const getElementArray = (item, selector) => {
	return Array.from(item.querySelectorAll(selector), (x) => x);
};
