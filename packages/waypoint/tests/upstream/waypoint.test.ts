import { renderToStaticMarkup } from 'octane/server';
import { describe, expect, it } from 'vitest';
import { SsrWaypoint } from './_fixtures/ssr-waypoint.tsrx';

// Per packages/waypoint/upstream/test/node/waypoint.test.jsx
describe('<Waypoint>', function waypointSuite() {
	it('does not throw an error when in an environment without window', function noWindow() {
		expect(typeof window).toBe('undefined');
		expect(function renderWithoutWindow() {
			renderToStaticMarkup(SsrWaypoint);
		}).not.toThrow();
	});
});
