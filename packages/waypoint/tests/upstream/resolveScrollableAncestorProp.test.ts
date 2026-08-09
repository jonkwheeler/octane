import { describe, expect, it } from 'vitest';
import { resolveScrollableAncestorProp } from '../../src/geometry.ts';

// Per packages/waypoint/upstream/test/node/resolveScrollableAncestorProp.test.js
describe('resolveScrollableAncestorProp()', function resolveScrollableAncestorPropSuite() {
	it('converts "window" into `global.window`', function convertsWindowString() {
		const previous = globalThis.window;
		const stub = {} as Window;
		globalThis.window = stub;

		try {
			expect(resolveScrollableAncestorProp('window')).toEqual(globalThis.window);
		} finally {
			globalThis.window = previous;
		}
	});

	it('passes other values through', function passesThrough() {
		expect(resolveScrollableAncestorProp('foo' as unknown as Window)).toEqual('foo');
	});
});
