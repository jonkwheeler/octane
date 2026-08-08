import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { useSnapshot } from '@octanejs/valtio/react';
import { useProxy } from '@octanejs/valtio/react/utils';
import { proxy, snapshot } from '@octanejs/valtio/vanilla';
import { subscribeKey } from '@octanejs/valtio/vanilla/utils';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

describe('vanilla entry points', () => {
	// OCTANE DIVERGENCE[valtio-debug-labels][adapted:valtio-debug-labels]
	// @parity-case adapted:valtio-debug-labels
	it('omits React DevTools debug labels from the snapshot hook', () => {
		const source = readFileSync(resolve(packageRoot, 'src/react.ts'), 'utf8');
		expect(source).not.toContain('useDebugValue');
	});
	it('exports the Octane hooks from the React-compatible subpaths', () => {
		expect(typeof useSnapshot).toBe('function');
		expect(typeof useProxy).toBe('function');
	});

	it('re-exports the Valtio vanilla core unchanged', () => {
		const state = proxy({ count: 1 });
		expect(snapshot(state).count).toBe(1);
	});

	it('re-exports vanilla utilities', async () => {
		const state = proxy({ count: 0 });
		const values: number[] = [];
		const unsubscribe = subscribeKey(state, 'count', (value) => values.push(value), true);
		state.count = 1;
		unsubscribe();
		expect(values).toEqual([1]);
	});
});
