import { expectTypeOf, test } from 'vitest';
import type { TableState } from '@tanstack/table-core';
import {
	createColumnHelper,
	createTableHookContexts,
	flexRender,
	tableFeatures,
	useTable,
} from '../src';

type Person = { name: string; age: number };

test('table options, rows, cells, selectors, and scoped contexts preserve inference', () => {
	const features = tableFeatures({});
	const helper = createColumnHelper<typeof features, Person>();
	const columns = [{ accessorKey: 'name', header: 'Name' }] as const;
	const table = useTable({ features, data: [{ name: 'Ada', age: 36 }], columns });
	const selected = useTable(
		{ features, data: [{ name: 'Ada', age: 36 }], columns },
		(state) => state,
	);

	expectTypeOf(table.getRowModel().rows[0].original).toExtend<Person>();
	expectTypeOf(helper.accessor).toBeFunction();
	expectTypeOf(selected.state).toEqualTypeOf<Readonly<TableState<typeof features>>>();
	expectTypeOf(flexRender).toBeFunction();

	const contexts = createTableHookContexts<typeof features>();
	expectTypeOf(contexts.useTableContext).toBeFunction();
});
