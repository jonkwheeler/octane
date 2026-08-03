import { List, useListRef } from '../../src';

export const listRuntimeEvents: {
	ranges: Array<{
		visible: { startIndex: number; stopIndex: number };
		overscan: { startIndex: number; stopIndex: number };
	}>;
	ref: ReturnType<typeof useListRef> | null;
} = { ranges: [], ref: null };

export function resetListRuntimeEvents() {
	listRuntimeEvents.ranges.length = 0;
	listRuntimeEvents.ref = null;
}

function Row({ ariaAttributes, index, label, style }: any) @{
	<div {...ariaAttributes} data-index={index} style={style}>{`${label} ${index}`}</div>
}

export function ListRuntimeFixture() @{
	const listRef = useListRef();
	listRuntimeEvents.ref = listRef;

	<List
		data-testid="list"
		listRef={listRef}
		onRowsRendered={(visible, overscan) => {
			listRuntimeEvents.ranges.push({ visible, overscan });
		}}
		overscanCount={1}
		rowComponent={Row}
		rowCount={100}
		rowHeight={20}
		rowKey={(index) => index}
		rowProps={{ label: 'Row' }}
		style={{ height: 100, width: 200 }}
	/>
}
