import { SessionIdSymbol } from '@livestore/common';
import { createTodoMvcStore, events, tables } from '@livestore/framework-toolkit/testing';
import type { Store, SyncStatus } from '@livestore/livestore';
import { Effect } from '@livestore/utils/effect';
import { describe, expect, it, vi } from 'vitest';
import { withReactApi } from '../src/useStore';
import { act, flushEffects, mount } from './_helpers';
import { DocumentReader, SyncReader } from './_fixtures/document-sync.tsrx';

describe('client documents', () => {
	it('resolves IDs and applies value, functional, and external updates reactively', async () => {
		await Effect.gen(function* () {
			const store = withReactApi(yield* createTodoMvcStore());
			let setRow!: (value: any) => void;
			const onSetter = (setter: (value: any) => void) => {
				setRow = setter;
			};
			const result = mount(DocumentReader, {
				store,
				table: tables.userInfo,
				id: 'u1',
				onSetter,
			});
			flushEffects();
			expect(result.find('#document').getAttribute('data-id')).toBe('u1');
			expect(result.find('#document').textContent).toContain('"username":""');

			yield* Effect.promise(() => act(() => setRow({ username: 'Ada' })));
			expect(result.find('#document').textContent).toContain('"username":"Ada"');

			yield* Effect.promise(() =>
				act(() => setRow((previous: { username: string }) => ({ ...previous, username: 'Grace' }))),
			);
			expect(result.find('#document').textContent).toContain('"username":"Grace"');

			yield* Effect.promise(() =>
				act(() => store.commit(events.UserInfoSet({ username: 'Lin' }, 'u1'))),
			);
			expect(result.find('#document').textContent).toContain('"username":"Lin"');

			result.update(DocumentReader, {
				store,
				table: tables.userInfo,
				id: SessionIdSymbol,
				onSetter,
			});
			expect(result.find('#document').getAttribute('data-id')).toBe(store.sessionId);
			result.unmount();
		}).pipe(Effect.scoped, Effect.runPromise);
	});
});

describe('sync status', () => {
	it('reads synchronously, reacts to notifications, switches stores, and unsubscribes', async () => {
		const makeStore = (initial: SyncStatus) => {
			let status = initial;
			const listeners = new Set<(value: SyncStatus) => void>();
			const unsubscribe = vi.fn((listener: (value: SyncStatus) => void) =>
				listeners.delete(listener),
			);
			return {
				store: {
					syncStatus: () => status,
					subscribeSyncStatus(listener: (value: SyncStatus) => void) {
						listeners.add(listener);
						return () => unsubscribe(listener);
					},
				} as unknown as Store<any>,
				emit(next: SyncStatus) {
					status = next;
					for (const listener of listeners) listener(next);
				},
				listeners,
				unsubscribe,
			};
		};
		const pending = { isSynced: false, pendingCount: 1 } as SyncStatus;
		const synced = { isSynced: true, pendingCount: 0 } as SyncStatus;
		const first = makeStore(pending);
		const second = makeStore(synced);
		const result = mount(SyncReader, { store: first.store });
		flushEffects();

		expect(result.find('#sync').textContent).toContain('"isSynced":false');
		await act(() => first.emit(synced));
		expect(result.find('#sync').textContent).toContain('"isSynced":true');

		result.update(SyncReader, { store: second.store });
		flushEffects();
		expect(first.listeners.size).toBe(0);
		expect(second.listeners.size).toBe(1);
		expect(result.find('#sync').textContent).toContain('"isSynced":true');

		result.unmount();
		flushEffects();
		expect(second.listeners.size).toBe(0);
		expect(first.unsubscribe).toHaveBeenCalledTimes(1);
		expect(second.unsubscribe).toHaveBeenCalledTimes(1);
	});
});
