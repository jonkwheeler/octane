import type { RefObject } from 'react';
import {
	type Align,
	type CellComponentProps,
	type DynamicRowHeight,
	Grid,
	type GridImperativeAPI,
	type GridProps,
	List,
	type ListImperativeAPI,
	type ListProps,
	type RowComponentProps,
	getScrollbarSize,
	useDynamicRowHeight,
	useGridCallbackRef,
	useGridRef,
	useListCallbackRef,
	useListRef,
} from 'react-window-under-test';

// @parity-case types:react-window-pristine
// @parity-case types:react-window-adapted

declare function expectType<T>(value: T): void;

type RowData = { label: string };
type CellData = { value: number };

const RowComponent = (props: RowComponentProps<RowData>) => {
	expectType<number>(props.index);
	expectType<string>(props.label);
	expectType<'listitem'>(props.ariaAttributes.role);
	return null;
};

const CellComponent = (props: CellComponentProps<CellData>) => {
	expectType<number>(props.columnIndex);
	expectType<number>(props.rowIndex);
	expectType<number>(props.value);
	expectType<'gridcell'>(props.ariaAttributes.role);
	return null;
};

const listProps: ListProps<RowData> = {
	defaultHeight: 200,
	rowComponent: RowComponent,
	rowCount: 100,
	rowHeight: 24,
	rowKey: (index, data) => `${data.label}-${index}`,
	rowProps: { label: 'row' },
};

const gridProps: GridProps<CellData> = {
	cellComponent: CellComponent,
	cellProps: { value: 1 },
	columnCount: 4,
	columnWidth: (index, data) => index + data.value,
	rowCount: 100,
	rowHeight: 24,
	rowKey: ({ data, rowIndex }) => `${data.value}-${rowIndex}`,
};

expectType<ReturnType<typeof List>>(List(listProps));
expectType<ReturnType<typeof Grid>>(Grid(gridProps));
expectType<number>(getScrollbarSize());
expectType<number>(getScrollbarSize(true));

const align: Align = 'smart';
expectType<Align>(align);

const dynamicHeight: DynamicRowHeight = useDynamicRowHeight({ defaultRowHeight: 24, key: 'rows' });
expectType<number>(dynamicHeight.getAverageRowHeight());
expectType<number | undefined>(dynamicHeight.getRowHeight(0));

const gridRef = useGridRef(null);
const listRef = useListRef(null);
expectType<RefObject<GridImperativeAPI | null>>(gridRef);
expectType<RefObject<ListImperativeAPI | null>>(listRef);

const [gridApi, setGridApi] = useGridCallbackRef(null);
const [listApi, setListApi] = useListCallbackRef(null);
expectType<GridImperativeAPI | null>(gridApi);
expectType<ListImperativeAPI | null>(listApi);
expectType<(value: GridImperativeAPI | null) => void>(setGridApi);
expectType<(value: ListImperativeAPI | null) => void>(setListApi);

gridApi?.scrollToCell({ columnIndex: 2, rowIndex: 3 });
listApi?.scrollToRow({ align: 'center', index: 3 });

const invalidListProps: ListProps<{ style: string }> = {
	...listProps,
	// @ts-expect-error rowProps may not override generated style
	rowProps: { style: 'forbidden' },
};
void invalidListProps;

const invalidGridProps: GridProps<{ columnIndex: number }> = {
	...gridProps,
	// @ts-expect-error cellProps may not override generated columnIndex
	cellProps: { columnIndex: 1 },
};
void invalidGridProps;

// @ts-expect-error scrollToCell requires both coordinates
gridApi?.scrollToCell({ rowIndex: 1 });

// @ts-expect-error v1 API names are intentionally absent from the v2.3.0 contract
import { FixedSizeList } from 'react-window-under-test';
void FixedSizeList;
