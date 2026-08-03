import Draggable, {
	DraggableCore,
	type ControlPosition,
	type DraggableBounds,
	type DraggableCoreProps,
	type DraggableData,
	type DraggableEvent,
	type DraggableEventHandler,
	type DraggableProps,
	type PositionOffsetControlPosition,
} from '../src/index.ts';

// One-for-one Octane type-seam adaptation of the pinned tag's typings/test.tsx
// and test/typeCompat/fixture.tsx public root imports and accept/reject shapes.

const position: ControlPosition = { x: 1, y: 2 };
const offset: PositionOffsetControlPosition = { x: '10%', y: 3 };
const bounds: DraggableBounds = { left: 0, right: 10 };
const coreProps: DraggableCoreProps = { nodeRef: { current: null } };
const props: DraggableProps = { position, positionOffset: offset, bounds };
const handler: DraggableEventHandler = (event: DraggableEvent, data: DraggableData) => {
	void event;
	void data;
};

void [Draggable, DraggableCore, coreProps, props, handler];
Draggable.displayName;
Draggable.defaultProps;
DraggableCore.displayName;
DraggableCore.defaultProps;

// @ts-expect-error positions require both coordinates
const badPosition: ControlPosition = { x: 1 };
// @ts-expect-error callback data coordinates are numeric
const badData: DraggableData = { node: document.body, x: '1' };
void [badPosition, badData];
