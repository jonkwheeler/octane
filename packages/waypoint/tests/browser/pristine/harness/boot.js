// Horizontal window-scroll smoke cases need a scrollable document; Chromium
// headless otherwise keeps scrollX at 0 when content only overflows via
// inline-block children inside an unstyled parent.
document.documentElement.style.minWidth = '1px';
document.documentElement.style.overflowX = 'scroll';
document.body.style.minWidth = '1px';

// Upstream calls window.scroll(x, y). Chromium headless often leaves scrollX at
// 0 unless documentElement/body scrollLeft are set explicitly as well.
window.scroll = function scroll(xOrOptions, y) {
	if (typeof xOrOptions === 'object' && xOrOptions !== null) {
		const left = Number(xOrOptions.left ?? 0);
		const top = Number(xOrOptions.top ?? 0);
		document.documentElement.scrollLeft = left;
		document.body.scrollLeft = left;
		document.documentElement.scrollTop = top;
		document.body.scrollTop = top;
		window.scrollTo(left, top);
		return;
	}
	const left = Number(xOrOptions ?? 0);
	const top = Number(y ?? 0);
	document.documentElement.scrollLeft = left;
	document.body.scrollLeft = left;
	document.documentElement.scrollTop = top;
	document.body.scrollTop = top;
	window.scrollTo(left, top);
};

const env = window.__waypointJasmineEnv;
const results = [];

env.addReporter({
	specDone(result) {
		results.push({
			fullName: result.fullName,
			status: result.status,
			failedExpectations: (result.failedExpectations || []).map(function mapFailure(failure) {
				return {
					message: failure.message,
					stack: failure.stack,
				};
			}),
		});
	},
});

let resolveDone;
window.__waypointPristineBrowserDone = new Promise(function createDone(resolve) {
	resolveDone = resolve;
});

env.afterAll(function finish() {
	window.__waypointPristineBrowserResults = results;
	resolveDone(results);
});

await import('./load-suite.jsx');
env.execute();
