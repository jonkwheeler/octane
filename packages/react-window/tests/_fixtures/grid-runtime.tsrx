import { Grid, useGridRef } from '../../src';

export const gridRuntimeEvents: {
	ranges: Array<{
		visible: {
			columnStartIndex: number;
			columnStopIndex: number;
			rowStartIndex: number;
			rowStopIndex: number;
		};
		overscan: {
			columnStartIndex: number;
			columnStopIndex: number;
			rowStartIndex: number;
			rowStopIndex: number;
		};
	}>;
	ref: ReturnType<typeof useGridRef> | null;
} = { ranges: [], ref: null };

export function resetGridRuntimeEvents() {
	gridRuntimeEvents.ranges.length = 0;
	gridRuntimeEvents.ref = null;
}

function Cell({ ariaAttributes, columnIndex, label, rowIndex, style }: any) @{
	<div
		{...ariaAttributes}
		data-cell={`${rowIndex}:${columnIndex}`}
		style={style}
	>{`${label} ${rowIndex}:${columnIndex}`}</div>
}

export function GridRuntimeFixture() @{
	const gridRef = useGridRef();
	gridRuntimeEvents.ref = gridRef;

	<Grid
		cellComponent={Cell}
		cellProps={{ label: 'Cell' }}
		columnCount={100}
		columnWidth={20}
		data-testid="grid"
		gridRef={gridRef}
		onCellsRendered={(visible, overscan) => {
			gridRuntimeEvents.ranges.push({ visible, overscan });
		}}
		overscanCount={1}
		rowCount={100}
		rowHeight={20}
		style={{ height: 100, width: 100 }}
	/>
}
