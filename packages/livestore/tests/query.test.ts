import { createTodoMvcStore, events, tables } from '@livestore/framework-toolkit/testing';
import { queryDb } from '@livestore/livestore';
import { Effect, Schema } from '@livestore/utils/effect';
import { beforeEach, describe, expect, it } from 'vitest';
import { withReactApi } from '../src/useStore';
import { __resetUseRcResourceCache } from '../src/useRcResource';
import { act, flushEffects, mount, nextPaint } from './_helpers';
import { QueryReader, TwoQueryReaders } from './_fixtures/query.tsrx';

beforeEach(() => {
	__resetUseRcResourceCache();
});

const allTodosQuery = () =>
	queryDb({
		query: 'select * from todos order by id',
		schema: Schema.Array(tables.todos.rowSchema),
	});

describe('reactive queries', () => {
	it('returns synchronously, reacts to commits, and switches query identity without stale data', async () => {
		await Effect.gen(function* () {
			const store = yield* createTodoMvcStore();
			const augmented = withReactApi(store);
			const allTodos$ = allTodosQuery();
			const firstTodo$ = queryDb({
				query: "select * from todos where id = 't1'",
				schema: Schema.Array(tables.todos.rowSchema),
			});
			let renders = 0;
			const onRender = () => renders++;
			const result = mount(QueryReader, {
				store: augmented,
				queryable: allTodos$,
				label: 'todos',
				onRender,
			});
			flushEffects();

			expect(result.find('.query').textContent).toBe('[]');
			yield* Effect.promise(() =>
				act(() => store.commit(events.todoCreated({ id: 't1', text: 'milk', completed: false }))),
			);
			void nextPaint();
			expect(result.find('.query').textContent).toContain('"text":"milk"');

			result.update(QueryReader, {
				store: augmented,
				queryable: firstTodo$,
				label: 'first',
				onRender,
			});
			expect(result.find('.query').textContent).toContain('"id":"t1"');

			const renderCount = renders;
			yield* Effect.promise(() =>
				act(() => store.commit(events.todoCreated({ id: 't2', text: 'bread', completed: false }))),
			);
			void nextPaint();
			expect(result.find('.query').textContent).not.toContain('"id":"t2"');
			expect(renders).toBe(renderCount);
			result.unmount();
		}).pipe(Effect.scoped, Effect.runPromise);
	});

	it('shares one query resource and unsubscribes only after the last consumer leaves', async () => {
		await Effect.gen(function* () {
			const store = yield* createTodoMvcStore();
			const augmented = withReactApi(store);
			const queryable = allTodosQuery();
			let query: { activeSubscriptions: Set<unknown> } | undefined;
			const onQuery = (value: object) => {
				query = value as { activeSubscriptions: Set<unknown> };
			};
			const result = mount(TwoQueryReaders, {
				store: augmented,
				queryable,
				showSecond: true,
				onQuery,
			});
			flushEffects();
			expect(query?.activeSubscriptions.size).toBe(2);

			result.update(TwoQueryReaders, {
				store: augmented,
				queryable,
				showSecond: false,
				onQuery,
			});
			flushEffects();
			expect(query?.activeSubscriptions.size).toBe(1);
			yield* Effect.promise(() =>
				act(() => store.commit(events.todoCreated({ id: 't1', text: 'milk', completed: false }))),
			);
			void nextPaint();
			expect(result.findAll('.query')).toHaveLength(1);
			expect(result.find('.query').textContent).toContain('milk');

			result.unmount();
			flushEffects();
			expect(query?.activeSubscriptions.size).toBe(0);
		}).pipe(Effect.scoped, Effect.runPromise);
	});
});
