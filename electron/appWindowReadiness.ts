export function createAppWindowReadinessGate(showWindow: () => void) {
	let ready = false;
	let pending = false;

	return {
		request() {
			if (ready) {
				showWindow();
				return;
			}
			pending = true;
		},
		markReady() {
			ready = true;
			if (pending) {
				pending = false;
				showWindow();
			}
		},
	};
}
