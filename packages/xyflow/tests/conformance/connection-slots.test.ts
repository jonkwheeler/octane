import { afterEach, describe, expect, it, vi } from 'vitest';
import { flushEffects, mount } from '../../../octane/tests/_helpers';
import { ConnectionSlotProbe } from '../_fixtures/connection-slots.tsrx';

describe('@octanejs/xyflow — connection hook slots', () => {
	let root: ReturnType<typeof mount> | undefined;

	afterEach(function cleanup() {
		root?.unmount();
		root = undefined;
		vi.restoreAllMocks();
	});

	it('keeps repeated connection hook calls independent', () => {
		vi.spyOn(console, 'warn').mockImplementation(function ignoreDeprecationWarning() {});

		root = mount(ConnectionSlotProbe);
		flushEffects();

		expect(root.container.querySelector('[data-testid="connected-node"]')?.textContent).toBe('1');
		expect(root.container.querySelector('[data-testid="isolated-node"]')?.textContent).toBe('0');
		expect(root.container.querySelector('[data-testid="connected-handle"]')?.textContent).toBe('1');
		expect(root.container.querySelector('[data-testid="isolated-handle"]')?.textContent).toBe('0');
	});
});
