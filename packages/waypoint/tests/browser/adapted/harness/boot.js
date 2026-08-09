// Horizontal window-scroll smoke cases need a scrollable document; Chromium
// headless otherwise keeps scrollX at 0 when content only overflows via
// inline-block children inside an unstyled parent.
document.documentElement.style.minWidth = '1px';
document.documentElement.style.overflowX = 'scroll';
document.body.style.minWidth = '1px';

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
window.__waypointAdaptedBrowserDone = new Promise(function createDone(resolve) {
	resolveDone = resolve;
});

env.afterAll(function finish() {
	window.__waypointAdaptedBrowserResults = results;
	resolveDone(results);
});

await import('./load-suite.jsx');
env.execute();
