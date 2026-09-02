/** @jsxImportSource @octanejs/lynx/intrinsics */
import { useRef } from 'octane';

import {
	ESTIMATED_ROW_HEIGHT_PX,
	LIST_BUFFER_ROWS,
	ROWS,
	createListSemanticCheckpoint,
} from './data.js';
import type {
	AttachedCellObservation,
	ListCaseId,
	ListObservation,
	ListSemanticCheckpoint,
} from './data.js';

interface ListScrollEvent {
	readonly detail: {
		readonly scrollTop: number;
		readonly attachedCells: readonly AttachedCellObservation[];
	};
}

interface ListLayoutEvent {
	readonly detail: {
		readonly scrollInfo: ListScrollEvent['detail'];
	};
}

type BoundedListGlobal =
	typeof globalThis & {
		__LYNX_BOUNDED_LIST_CHECKPOINT__?: (caseId: ListCaseId) => ListSemanticCheckpoint | undefined;
	};

function copyObservation(info: ListScrollEvent['detail']): ListObservation {
	return Object.freeze({
		scrollTop: info.scrollTop,
		attachedCells: Object.freeze(
			info.attachedCells.map(({ index, itemKey }) => Object.freeze({ index, itemKey })),
		),
	});
}

function readCheckpoint(
	caseId: ListCaseId,
	observation: ListObservation | null,
): ListSemanticCheckpoint | undefined {
	return createListSemanticCheckpoint(caseId, observation);
}

export function App() @{
	const observation = useRef<ListObservation | null>(null);
	const captureScroll = (event: ListScrollEvent): void => {
		observation.current = copyObservation(event.detail);
	};
	const captureLayout = (event: ListLayoutEvent): void => {
		observation.current = copyObservation(event.detail.scrollInfo);
	};

	(globalThis as BoundedListGlobal).__LYNX_BOUNDED_LIST_CHECKPOINT__ = (caseId) => readCheckpoint(
		caseId,
		observation.current,
	);

	<view class="page">
		<list
			id="bounded-native-list"
			class="bounded-list"
			list-type="single"
			scroll-orientation="vertical"
			enable-scroll={true}
			need-visible-item-info={true}
			need-layout-complete-info={true}
			scroll-event-throttle={0}
			preload-buffer-count={LIST_BUFFER_ROWS}
			bindscroll={captureScroll}
			bindlayoutcomplete={captureLayout}
		>
			@for (const row of ROWS; key row.id) {
				<list-item
					class="row"
					item-key={row.id}
					reuse-identifier="bounded-row"
					estimated-main-axis-size-px={ESTIMATED_ROW_HEIGHT_PX}
					recyclable={true}
					defer
				>
					<text class="row-label">{row.label as string}</text>
				</list-item>
			}
		</list>
	</view>
}
