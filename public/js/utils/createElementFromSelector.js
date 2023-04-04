// export const createElementx = (selector) => {
// 	var pattern = /^(.*?)(?:#(.*?))?(?:\.(.*?))?(?:@(.*?)(?:=(.*?))?)?$/;
// 	var matches = selector.match(pattern);
// 	var element = document.createElement(matches[1] || 'div');
// 	if (matches[2]) element.id = matches[2];
// 	if (matches[3]) element.className = matches[3];
// 	if (matches[4]) element.setAttribute(matches[4], matches[5] || '');
// 	return element;
// };

export const createElement = (selector, ...attributes) => {
	const names = selector.split(/\.|\#/);
	let element;
	let tagFound = false;
	if (names.length === 0 || names[0] === '') {
		element = document.createElement('div');
	} else {
		element = document.createElement(names[0]);
		tagFound = true;
	}
	const idFinder = selector.split('#');
	let tokens = [];
	if (idFinder.length > 2) return null;
	else if (idFinder.length === 2) {
		element.setAttribute('id', idFinder[1].split('.')[0]);
		tokens = idFinder[1].split('.').splice(1);
	}
	tokens = idFinder[0].split('.').concat(tokens);
	tokens.forEach((t, i) => {
		if (i === 0 && tagFound) return;
		if (t !== '') {
			const attrCheck = t.split(/\[|\]/);
			if (attrCheck.length === 1) return element.classList.add(t);

			attrCheck.forEach((a, j) => {
				if (j === 0) element.classList.add(a);
				else if (!a) return;
				else {
					const t = a.split('=');
					if (t.length === 1) element.setAttribute(a, '');
					else {
						const attrName = t[0];
						let attrValue = t.splice(1).join('=');
						const first = attrValue.charAt(0);
						const last = attrValue.charAt(attrValue.length - 1);
						if (first === last && ['"', "'", '`'].includes(first)) {
							attrValue = attrValue.substring(1, attrValue.length - 1);
						}
						element.setAttribute(attrName, attrValue);
					}
				}
			});
		}
	});

	if (attributes.length > 0) {
		const propertyNames = Object.getOwnPropertyNames(attributes[0]);
		propertyNames.forEach((n) => {
			const type = (typeof attributes[0][n]).toLowerCase();
			if (type === 'number' || type === 'string')
				element.setAttribute(`data-${n}`, attributes[0][n]);
		});
	}

	return element;
};
