// Adapted side: @octanejs/tanstack-table, compiled with tsrx-tsc. Assertion
// groups are listed in ../assertions.md and must stay one-for-one with
// ../pristine/types.test-d.ts.
import type { TableState } from '@tanstack/table-core';
import {
	createColumnHelper,
	createTableHookContexts,
	flexRender,
	tableFeatures,
	useTable,
} from '@octanejs/tanstack-table';

type Person = { name: string; age: number };

// 1. useTable accepts features, data, and columns and returns a typed table.
const features = tableFeatures({});
const columns = [{ accessorKey: 'name' as const, header: 'Name' }];
const table = useTable({ features, data: [{ name: 'Ada', age: 36 }], columns });
const firstOriginal: Person = table.getRowModel().rows[0].original;
void firstOriginal;

// 2. A selector overload preserves TableState inference.
const selected = useTable(
	{ features, data: [{ name: 'Ada', age: 36 }], columns },
	(state) => state,
);
const selectedState: Readonly<TableState<typeof features>> = selected.state;
void selectedState;

// 3. createColumnHelper is a callable helper factory.
const helper = createColumnHelper<typeof features, Person>();
const helperIsFunction: typeof helper.accessor = helper.accessor;
void helperIsFunction;

// 4. flexRender is a callable render helper.
const flexRenderIsFunction: typeof flexRender = flexRender;
void flexRenderIsFunction;

// 5. createTableHookContexts exposes useTableContext.
const contexts = createTableHookContexts<typeof features>();
const useTableContextIsFunction: typeof contexts.useTableContext = contexts.useTableContext;
void useTableContextIsFunction;

// 6. useTable rejects an unknown option key.
useTable({
	features,
	data: [{ name: 'Ada', age: 36 }],
	columns,
	// @ts-expect-error unknown option
	notATableOption: true,
});
