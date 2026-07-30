import { raf } from '@react-spring/rafz';
import { describe, expect, it } from 'vitest';
import { act, flushEffects, mount } from '../../../octane/tests/_helpers';
import { TransitionFixture } from '../_fixtures/transitions.tsrx';

describe('useTransition', () => {
	it('retains keys and removes a settled leaving item', async () => {
		raf.frameLoop = 'demand';
		const result = mount(TransitionFixture, {
			items: [
				{ id: 'a', label: 'A' },
				{ id: 'b', label: 'B' },
			],
		});
		flushEffects();
		raf.advance();
		expect(result.findAll('[data-key]').map((node) => node.getAttribute('data-key'))).toEqual([
			'a',
			'b',
		]);

		result.update(TransitionFixture, {
			items: [
				{ id: 'b', label: 'B2' },
				{ id: 'c', label: 'C' },
			],
		});
		flushEffects();
		await act(async () => {
			raf.advance();
			await Promise.resolve();
		});
		flushEffects();

		expect(result.findAll('[data-key]').map((node) => node.getAttribute('data-key'))).toEqual([
			'b',
			'c',
		]);
		expect(result.find('[data-key="b"]').textContent).toBe('B2');
		result.unmount();
		raf.frameLoop = 'always';
	});
});
