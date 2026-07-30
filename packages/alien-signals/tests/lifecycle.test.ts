import { describe, expect, it } from 'vitest';
import { createSignal } from '@octanejs/alien-signals';
import { mount, nextPaint } from './_helpers';
import { LifecycleEffects, ScopeProbe } from './_fixtures/hooks.tsrx';

describe('@octanejs/alien-signals lifecycle hooks', () => {
	it('runs effect cleanup before reruns and on unmount', async () => {
		const source = createSignal(0);
		const entries: string[] = [];
		const result = mount(LifecycleEffects, {
			source,
			log: (entry) => entries.push(entry),
			onStop: () => {},
		});
		await nextPaint();

		expect(entries).toEqual(['effect:0', 'scope-a:0', 'scope-b:0']);
		source(1);
		expect(entries).toEqual([
			'effect:0',
			'scope-a:0',
			'scope-b:0',
			'cleanup',
			'effect:1',
			'scope-a:1',
			'scope-b:1',
		]);

		result.unmount();
		await nextPaint();
		expect(entries.at(-1)).toBe('cleanup');
		source(2);
		expect(entries.filter((entry) => entry.endsWith(':2'))).toEqual([]);
	});

	it('returns a stop controller that disposes every scoped effect', async () => {
		const source = createSignal(0);
		const entries: string[] = [];
		let stop = () => {};
		const result = mount(LifecycleEffects, {
			source,
			log: (entry) => entries.push(entry),
			onStop: (nextStop) => {
				stop = nextStop;
			},
		});
		await nextPaint();

		stop();
		source(1);
		expect(entries.filter((entry) => entry.startsWith('scope-') && entry.endsWith(':1'))).toEqual(
			[],
		);
		result.unmount();
	});

	it('cancels a scope before commit and remains safe during unmount', async () => {
		const source = createSignal(0);
		const entries: string[] = [];
		let stop = () => {};
		const result = mount(ScopeProbe, {
			source,
			label: 'pending',
			log: (entry) => entries.push(entry),
			onStop: (nextStop) => {
				stop = nextStop;
			},
		});

		stop();
		await nextPaint();
		expect(entries).toEqual([]);
		result.unmount();
	});

	it('stops the prior scope when callback identity changes', async () => {
		const source = createSignal(0);
		const entries: string[] = [];
		const props = {
			source,
			label: 'first',
			log: (entry: string) => {
				entries.push(entry);
			},
			onStop: () => {},
		};
		const result = mount(ScopeProbe, props);
		await nextPaint();
		expect(entries).toEqual(['first:0']);

		result.update(ScopeProbe, { ...props, label: 'second' });
		await nextPaint();
		source(1);
		expect(entries).toEqual(['first:0', 'second:0', 'second:1']);
		result.unmount();
	});
});
