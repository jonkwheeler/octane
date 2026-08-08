import { SessionIdSymbol } from '@livestore/common';
import { createTodoMvcStore, events, tables } from '@livestore/framework-toolkit/testing';
import type { Store, SyncStatus } from '@livestore/livestore';
import { Effect } from '@livestore/utils/effect';
import { drainPassiveEffects, flushSync, hydrateRoot } from 'octane';
import { describe, expect, it, vi } from 'vitest';
import { withReactApi } from '../src/useStore';
import { act, flushEffects, mount } from './_helpers';
import {
	ChainedDocumentReader,
	DocumentReader,
	KvDocumentReader,
	SyncReader,
} from './_fixtures/document-sync.tsrx';

describe('client documents', () => {
	it('resolves IDs and applies value, functional, and external updates reactively', async () => {
		await Effect.gen(function* () {
			const store = withReactApi(yield* createTodoMvcStore());
			let setRow!: (value: any) => void;
			const onSetter = function onSetter(setter: (value: any) => void) {
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

			yield* Effect.promise(function commitAda() {
				return act(function setAda() {
					setRow({ username: 'Ada' });
				});
			});
			expect(result.find('#document').textContent).toContain('"username":"Ada"');

			yield* Effect.promise(function commitGrace() {
				return act(function setGrace() {
					setRow(function updateUsername(previous: { username: string }) {
						return { ...previous, username: 'Grace' };
					});
				});
			});
			expect(result.find('#document').textContent).toContain('"username":"Grace"');

			yield* Effect.promise(function commitLin() {
				return act(function setLin() {
					store.commit(events.UserInfoSet({ username: 'Lin' }, 'u1'));
				});
			});
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

	// Per upstream/src/useClientDocument.test.tsx:195
	it('should work for a useClientDocument query chained with a useTemporary query', async () => {
		await Effect.gen(function* () {
			const store = withReactApi(yield* createTodoMvcStore());
			store.commit(
				events.todoCreated({ id: 't1', text: 'buy milk', completed: false }),
				events.todoCreated({ id: 't2', text: 'buy bread', completed: false }),
			);
			let renders = 0;
			const onRender = function onRender() {
				renders += 1;
			};
			const result = mount(ChainedDocumentReader, {
				store,
				userId: 'u1',
				onRender,
			});
			flushEffects();

			yield* Effect.promise(function commitFilter() {
				return act(function setFilter() {
					store.commit(events.UserInfoSet({ username: 'username_u2', text: 'milk' }, 'u2'));
				});
			});
			expect(result.find('#chained').getAttribute('data-count')).toBe('2');
			expect(renders).toBe(1);

			result.update(ChainedDocumentReader, {
				store,
				userId: 'u2',
				onRender,
			});
			flushEffects();
			expect(result.find('#chained').getAttribute('data-count')).toBe('1');
			expect(renders).toBe(2);
			result.unmount();
		}).pipe(Effect.scoped, Effect.runPromise);
	});

	// Per upstream/src/useClientDocument.test.tsx:238
	it('kv client document overwrites value (Schema.Any, no partial merge)', async () => {
		await Effect.gen(function* () {
			const store = withReactApi(yield* createTodoMvcStore());
			let setState!: (value: any) => void;
			let renders = 0;
			const onSetter = function onSetter(setter: (value: any) => void) {
				setState = setter;
			};
			const onRender = function onRender() {
				renders += 1;
			};
			const result = mount(KvDocumentReader, {
				store,
				id: 'k1',
				onSetter,
				onRender,
			});
			flushEffects();
			expect(result.find('#kv').getAttribute('data-id')).toBe('k1');
			expect(result.find('#kv').textContent).toBe('null');
			expect(renders).toBe(1);

			yield* Effect.promise(function writeNumber() {
				return act(function setNumber() {
					setState(1);
				});
			});
			expect(result.find('#kv').textContent).toBe('1');
			expect(renders).toBe(2);

			yield* Effect.promise(function writeObject() {
				return act(function setObject() {
					setState({ b: 2 });
				});
			});
			expect(result.find('#kv').textContent).toBe('{"b":2}');
			expect(renders).toBe(3);
			result.unmount();
		}).pipe(Effect.scoped, Effect.runPromise);
	});
});

describe('sync status', () => {
	it('reads synchronously, reacts to notifications, switches stores, and unsubscribes', async () => {
		const makeStore = function makeStore(initial: SyncStatus) {
			let status = initial;
			const listeners = new Set<(value: SyncStatus) => void>();
			const unsubscribe = vi.fn(function unsubscribeListener(
				listener: (value: SyncStatus) => void,
			) {
				listeners.delete(listener);
			});
			return {
				store: {
					syncStatus: function syncStatus() {
						return status;
					},
					subscribeSyncStatus(listener: (value: SyncStatus) => void) {
						listeners.add(listener);
						return function unsubscribeCurrent() {
							unsubscribe(listener);
						};
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
		const stalePending = { isSynced: false, pendingCount: 9 } as SyncStatus;
		const first = makeStore(pending);
		const second = makeStore(synced);
		const result = mount(SyncReader, { store: first.store });
		flushEffects();

		expect(result.find('#sync').textContent).toContain('"isSynced":false');
		await act(function emitSynced() {
			first.emit(synced);
		});
		expect(result.find('#sync').textContent).toContain('"isSynced":true');

		result.update(SyncReader, { store: second.store });
		// Render has switched the tracked store, but the previous subscription is
		// still live until effect cleanup. A late emission must not win.
		await act(function emitStale() {
			first.emit(stalePending);
		});
		expect(result.find('#sync').textContent).toContain('"isSynced":true');
		expect(result.find('#sync').textContent).not.toContain('"pendingCount":9');

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

	it('hydrates existing DOM and keeps the adopted host reactive', async () => {
		let status = { isSynced: false, pendingCount: 1 } as SyncStatus;
		const listeners = new Set<(value: SyncStatus) => void>();
		const store = {
			syncStatus: function syncStatus() {
				return status;
			},
			subscribeSyncStatus(listener: (value: SyncStatus) => void) {
				listeners.add(listener);
				return function unsubscribe() {
					listeners.delete(listener);
				};
			},
		} as unknown as Store<any>;
		const container = document.createElement('div');
		container.innerHTML = `<div id="sync">${JSON.stringify(status)}</div>`;
		document.body.appendChild(container);
		const serverHost = container.querySelector('#sync');

		const root = hydrateRoot(container, SyncReader, { store });
		drainPassiveEffects();
		expect(container.querySelector('#sync')).toBe(serverHost);

		status = { isSynced: true, pendingCount: 0 } as SyncStatus;
		await act(function emitHydrated() {
			for (const listener of listeners) listener(status);
		});
		expect(container.querySelector('#sync')).toBe(serverHost);
		expect(serverHost?.textContent).toContain('"isSynced":true');

		flushSync(function unmountHydrated() {
			root.unmount();
		});
		container.remove();
	});
});
