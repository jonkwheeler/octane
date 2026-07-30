import { BehaviorSubject, Observable, of } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { bind, shareLatest, state } from '@octanejs/rxjs';
import { createSignal } from '@octanejs/rxjs/utils';
import { mount, nextPaint } from './_helpers';
import { Reader, SubscribeReader } from './_fixtures/reader.tsrx';

describe('@octanejs/rxjs', () => {
	it('renders the current value and tracks later emissions', async () => {
		const source = new BehaviorSubject(1);
		const view = mount(Reader, { source });
		await nextPaint();
		expect(view.find('#value').textContent).toBe('1');

		source.next(2);
		await nextPaint();
		expect(view.find('#value').textContent).toBe('2');
		view.unmount();
	});

	it('preserves the bind and state contracts', () => {
		const [useBound, bound] = bind(of(1), 0);
		expect(typeof useBound).toBe('function');
		expect(bound.getValue()).toBe(0);
		expect(state(of(2), 1).getValue()).toBe(1);
	});

	it('shares and replays one source subscription', () => {
		let subscriptions = 0;
		const source = new Observable<number>((subscriber) => {
			subscriptions++;
			subscriber.next(1);
		}).pipe(shareLatest());
		const a = source.subscribe();
		const b = source.subscribe();
		expect(subscriptions).toBe(1);
		a.unsubscribe();
		b.unsubscribe();
	});

	it('exports framework-neutral utilities from the utils subpath', () => {
		const [value$, emit] = createSignal<number>();
		const values: number[] = [];
		const subscription = value$.subscribe((value) => values.push(value));
		emit(3);
		expect(values).toEqual([3]);
		subscription.unsubscribe();
	});

	it('establishes an eager source subscription before rendering children', async () => {
		const source = new BehaviorSubject(4);
		const view = mount(SubscribeReader, { source });
		await nextPaint();
		expect(view.find('#value').textContent).toBe('4');
		view.unmount();
	});
});
