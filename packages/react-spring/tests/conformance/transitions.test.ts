import { raf } from '@react-spring/rafz';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, flushEffects, mount } from '../../../octane/tests/_helpers';
import { TransitionFixture } from '../_fixtures/transitions.tsrx';

describe('useTransition', () => {
	afterEach(() => vi.useRealTimers());
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

	it('holds entering items until exiting items settle', async () => {
		const result = mount(TransitionFixture, {
			items: [{ id: 'a', label: 'A' }],
			exitBeforeEnter: true,
		});
		flushEffects();
		result.update(TransitionFixture, {
			items: [{ id: 'b', label: 'B' }],
			exitBeforeEnter: true,
		});
		expect(result.findAll('[data-key]').map((node) => node.getAttribute('data-key'))).toEqual([
			'a',
		]);
		flushEffects();
		await act(async () => await Promise.resolve());
		flushEffects();
		expect(result.findAll('[data-key]').map((node) => node.getAttribute('data-key'))).toEqual([
			'b',
		]);
		result.unmount();
	});

	it('applies reverse trail order to leaving transitions', async () => {
		vi.useFakeTimers();
		const started: string[] = [];
		const result = mount(TransitionFixture, {
			items: [
				{ id: 'a', label: 'A' },
				{ id: 'b', label: 'B' },
				{ id: 'c', label: 'C' },
			],
			trail: 100,
			reverse: true,
			onStart: (_result: unknown, controller: any) =>
				started.push(controller.get().opacity === 0 ? 'leave' : 'enter'),
		});
		flushEffects();
		await vi.runAllTimersAsync();
		started.length = 0;
		result.update(TransitionFixture, {
			items: [],
			trail: 100,
			reverse: true,
			onStart: () => started.push('start'),
		});
		flushEffects();
		expect(started).toHaveLength(1);
		await vi.runAllTimersAsync();
		expect(started).toHaveLength(3);
		result.unmount();
	});
});
