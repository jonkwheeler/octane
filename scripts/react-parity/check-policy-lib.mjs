export function parseReactParityCheckArgs(argv) {
	const deferBrowserLanes = argv.includes('--defer-browser-lanes');
	const unknown = argv.filter((argument) => argument !== '--defer-browser-lanes');
	if (unknown.length > 0) throw new Error(`unknown argument: ${unknown.join(', ')}`);
	if (argv.filter((argument) => argument === '--defer-browser-lanes').length > 1)
		throw new Error('--defer-browser-lanes may only be specified once');
	return { deferBrowserLanes };
}

export function partitionRequiredLanes(lanes, { deferBrowserLanes }) {
	if (!deferBrowserLanes) return { executable: lanes, deferred: [] };
	return {
		executable: lanes.filter((lane) => lane.type !== 'browser'),
		deferred: lanes.filter((lane) => lane.type === 'browser'),
	};
}

export function verifyBrowserDeferral({ deferBrowserLanes }, deferred) {
	if (deferBrowserLanes && deferred.length === 0)
		throw new Error('--defer-browser-lanes did not defer a required browser lane');
}
