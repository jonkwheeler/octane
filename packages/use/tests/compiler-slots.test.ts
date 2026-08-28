import { describe, expect, it, vi } from 'vitest';
import { flushEffects, mount } from '../../octane/tests/_helpers';
import { CompilerSlotDefaultsFixture } from './_fixtures/compiler-slots.tsrx';

describe('@octanejs/use compiler slots', () => {
	it('keeps omitted hook arguments at their authored defaults', () => {
		const onEvent = vi.fn();
		const app = mount(CompilerSlotDefaultsFixture, { onEvent });
		flushEffects();
		const output = app.find('span');
		expect(output.getAttribute('data-async-state')).toBe('object');
		expect(output.getAttribute('data-observable')).toBe('undefined');
		window.dispatchEvent(new Event('slot-safe-event'));
		expect(onEvent).toHaveBeenCalledOnce();
		app.unmount();
	});
});
