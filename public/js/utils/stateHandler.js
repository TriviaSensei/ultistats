export class StateHandler {
	constructor(initialState, ...validator) {
		if ((typeof initialState).toLowerCase() === 'function')
			throw new Error('State cannot be set to a function');

		this.state = initialState;

		if (validator) {
			this.validator = validator[0];
		}

		this.objects = [];
	}

	validateState(state) {
		return this.validator(state);
	}

	addWatcher(obj, updater) {
		if (
			obj &&
			this.objects.some((o) => {
				return o.node === obj;
			})
		)
			throw new Error('Object is already added to this state handler.');
		else if (obj && (!obj.nodeType || obj.nodeType !== Node.ELEMENT_NODE))
			throw new Error(`Object ${obj.toString()} is not a valid node`);
		this.objects.push({
			node: obj,
			updater,
		});
		if (obj) {
			obj.addEventListener('update-state', updater);
			const evt = new CustomEvent('update-state', {
				detail: this.state,
			});
			obj.dispatchEvent(evt);
		} else {
			updater(this.state);
		}
	}

	removeWatcher(obj) {
		if (!obj) return;
		else if (obj.nodeType && obj.nodeType === Node.ELEMENT_NODE)
			this.objects = this.objects.filter((o) => {
				return o !== obj;
			});
		else if ((typeof obj).toLowerCase() === 'function') {
			this.objects = this.objects.filter((o) => {
				return o.updater !== obj;
			});
		}
	}

	setState(s) {
		if ((typeof s).toLowerCase() === 'function') {
			if (this.validator && !this.validateState(s(this.state)))
				throw new Error('State is invalid');
			this.state = s(this.state);
		} else if (Array.isArray(s)) {
			this.state = [...s];
		} else {
			if (this.validator && !this.validateState(s))
				throw new Error('State is invalid');
			this.state = s;
		}
		const evt = new CustomEvent('update-state', {
			detail: this.state,
		});
		this.objects.forEach((o) => {
			if (o.node) {
				if (!document.body.contains(o.node)) return this.removeWatcher(o);
				else o.node.dispatchEvent(evt);
			} else {
				o.updater(this.getState());
			}
		});
	}

	getState() {
		if (!this.state) return null;
		else if (Array.isArray(this.state)) {
			return this.state;
		} else if ((typeof this.state).toLowerCase() === 'object') {
			return {
				...this.state,
			};
		}
		return this.state;
	}

	refreshState() {
		this.setState(this.state);
	}
}
