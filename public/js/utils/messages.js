export const msgTypes = [
	{
		type: 'error',
		color: '#ffffff',
		bgcolor: '#ab0000',
	},
	{
		type: 'warning',
		color: '#000000',
		bgcolor: '#bed400',
	},
	{
		type: 'info',
		color: '#000000',
		bgcolor: '#d9ffd6',
	},
];

export const msgTimeout = {
	value: null,
};

export const showMessage = (type, msg, ...time) => {
	let duration;
	if (time.length > 0) {
		duration = Math.max(1, time[0]);
	} else {
		duration = 1000;
	}
	clearTimeout(msgTimeout.value);
	hideMessage();
	let color;
	let bgcolor;
	let msgType = msgTypes.find((el) => {
		return el.type === type;
	});
	if (msgType) {
		color = msgType.color;
		bgcolor = msgType.bgcolor;
	} else {
		color = 'black';
		bgcolor = 'white';
	}
	const msgDiv = document.querySelector('.message');
	msgDiv.innerHTML = msg;
	msgDiv.style = `color:${color};background-color:${bgcolor};opacity:1;`;
	msgDiv.classList.remove('invisible-div');
	msgTimeout.value = setTimeout(hideMessage, duration);
};

export const hideMessage = () => {
	const msgDiv = document.querySelector('.message');
	msgDiv.classList.add('invisible-div');
	// msgTimeout = setTimeout(() => {
	//   msgDiv.style = 'display:none;';
	// }, 250);
};
