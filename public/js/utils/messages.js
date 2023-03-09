export const msgTypes = [
	{
		type: 'error',
		color: '#ffffff',
		bgcolor: '#ab0000',
		defaultLength: 2000,
	},
	{
		type: 'warning',
		color: '#000000',
		bgcolor: '#bed400',
		defaultLength: 2000,
	},
	{
		type: 'info',
		color: '#000000',
		bgcolor: '#d9ffd6',
		defaultLength: 1000,
	},
	{
		type: 'success',
		color: '#000000',
		bgcolor: '#d9ffd6',
		defaultLength: 1000,
	},
];

export const msgTimeout = {
	value: null,
};

export const showMessage = (type, msg, ...time) => {
	clearTimeout(msgTimeout.value);
	hideMessage();
	let color;
	let bgcolor;
	let duration;
	if (time.length > 0) {
		duration = Math.max(1, time[0]);
	} else {
		duration = 1000;
	}
	let msgType = msgTypes.find((el) => {
		return el.type === type;
	});
	if (msgType) {
		color = msgType.color;
		bgcolor = msgType.bgcolor;
		if (time.length > 0) {
			duration = Math.max(1, time[0]);
		} else {
			duration = msgType.defaultLength;
		}
	} else {
		color = 'black';
		bgcolor = 'white';
		duration = 1000;
	}
	const msgDiv = document.querySelector('.message');
	msgDiv.innerHTML = msg;
	msgDiv.style = `color:${color};background-color:${bgcolor};opacity:1;`;
	msgDiv.classList.remove('d-none');
	msgTimeout.value = setTimeout(hideMessage, duration);
};

export const hideMessage = () => {
	const msgDiv = document.querySelector('.message');
	msgDiv.classList.add('d-none');
	// msgTimeout = setTimeout(() => {
	//   msgDiv.style = 'display:none;';
	// }, 250);
};
