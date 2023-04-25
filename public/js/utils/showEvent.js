const lastEvent = document.querySelector('#event-desc');

export const showEvent = (msg) => {
	if (Array.isArray(msg)) {
		let str = '';
		msg.forEach((m, i) => {
			if (i !== 0) str = `${str}<br>`;
			str = `${str}${m}`;
		});
		lastEvent.innerHTML = str;
	} else if ((typeof msg).toLowerCase() === 'string') {
		lastEvent.innerHTML = msg;
	}
};
