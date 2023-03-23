export const showDiv = (node) => {
	let parent = node.parentElement;
	if (!parent) return;
	let sibling = parent.firstChild;
	while (sibling) {
		if (sibling.nodeType === 1) {
			if (sibling !== node) {
				sibling.classList.add('d-none');
			} else {
				sibling.classList.remove('d-none');
			}
		}
		sibling = sibling.nextSibling;
	}
};
