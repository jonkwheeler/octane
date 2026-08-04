import { clsx } from 'clsx';
import {
	Children,
	cloneElement,
	descriptorChildren,
	type ElementDescriptor,
	useLayoutEffect,
	useRef,
	useState,
} from 'octane';
import DraggableCore from './DraggableCore.tsrx';
import { assignRef, type StructuralRef } from './internal.ts';
import { createCSSTransform, createSVGTransform } from './utils/domFns.ts';
import {
	canDragX,
	canDragY,
	createDraggableData,
	getBoundPosition,
	type DraggableModel,
} from './utils/positionFns.ts';
import type { DraggableData, DraggableEvent } from './utils/types.ts';
import type { DraggableCoreProps, DraggableProps } from './types.ts';

const defaults = {
	axis: 'both',
	bounds: false,
	defaultClassName: 'react-draggable',
	defaultClassNameDragging: 'react-draggable-dragging',
	defaultClassNameDragged: 'react-draggable-dragged',
	defaultPosition: { x: 0, y: 0 },
	scale: 1,
} as const;

interface State {
	dragging: boolean;
	dragged: boolean;
	x: number;
	y: number;
	slackX: number;
	slackY: number;
	isElementSVG: boolean;
	prevPropsPosition: { x: number; y: number } | null;
}

function DraggableImpl(inputProps: Partial<DraggableProps>): ElementDescriptor {
	const props = { ...defaults, ...inputProps } as Required<typeof defaults> & DraggableProps;
	const [, rerender] = useState(0);
	const child = Children.only(props.children) as
		ElementDescriptor<{
			class?: string;
			className?: string;
			style?: Record<string, unknown>;
			ref?: unknown;
		}>;
	const nodeRef = props.nodeRef;
	const stateRef = useRef<State | null>(null);
	if (!stateRef.current) {
		const initial = props.position ?? props.defaultPosition;
		stateRef.current = {
			dragging: false,
			dragged: false,
			x: initial.x,
			y: initial.y,
			slackX: 0,
			slackY: 0,
			isElementSVG: false,
			prevPropsPosition: props.position ? { ...props.position } : null,
		};
		if (props.position && !(inputProps.onDrag || inputProps.onStop)) {
			console.warn(
				'A `position` was applied to this <Draggable>, without drag handlers. This will make this component effectively undraggable. Please attach `onDrag` or `onStop` handlers so you can adjust the `position` of this element.',
			);
		}
	}
	const state = stateRef.current;
	if (
		props.position &&
			(!state.prevPropsPosition || props.position.x !== state.prevPropsPosition.x ||
				props.position.y !== state.prevPropsPosition.y)
	) {
		state.x = props.position.x;
		state.y = props.position.y;
		state.prevPropsPosition = { ...props.position };
	}
	const model = {
		props,
		state,
		lastX: NaN,
		lastY: NaN,
		findDOMNode: () => nodeRef?.current ?? null,
	} as DraggableModel;
	const onStart = (event: DraggableEvent, coreData: DraggableData) => {
		if (props.onStart?.(event, createDraggableData(model, coreData)) === false) return false;
		state.dragging = true;
		state.dragged = true;
		rerender((value) => value + 1);
	};
	const onDrag = (event: DraggableEvent, coreData: DraggableData) => {
		if (!state.dragging) return false;
		const data = createDraggableData(model, coreData);
		let x = data.x, y = data.y, slackX = 0, slackY = 0;
		if (props.bounds) {
			const originalX = x, originalY = y;
			[x, y] = getBoundPosition(model, x + state.slackX, y + state.slackY);
			slackX = state.slackX + originalX - x;
			slackY = state.slackY + originalY - y;
			data.x = x;
			data.y = y;
			data.deltaX = x - state.x;
			data.deltaY = y - state.y;
		}
		if (props.onDrag?.(event, data) === false) return false;
		Object.assign(state, { x, y, slackX, slackY });
		rerender((value) => value + 1);
	};
	const onStop = (event: DraggableEvent, coreData: DraggableData) => {
		if (!state.dragging) return false;
		if (props.onStop?.(event, createDraggableData(model, coreData)) === false) return false;
		state.dragging = false;
		state.slackX = state.slackY = 0;
		if (props.position) Object.assign(state, props.position);
		rerender((value) => value + 1);
	};
	useLayoutEffect(() => {
		const isSVG = typeof SVGElement !== 'undefined' && nodeRef?.current instanceof SVGElement;
		if (state.isElementSVG !== isSVG) {
			state.isElementSVG = isSVG;
			rerender((value) => value + 1);
		}
	}, []);
	const controlled = Boolean(props.position);
	const movable = !controlled || state.dragging;
	const valid = props.position ?? props.defaultPosition;
	const position = {
		x: canDragX(model) && movable ? state.x : valid.x,
		y: canDragY(model) && movable ? state.y : valid.y,
	};
	const transform = state.isElementSVG
		? { transform: createSVGTransform(position, props.positionOffset!) }
		: { style: { ...child.props.style, ...createCSSTransform(position, props.positionOffset!) } };
	const ref = (value: HTMLElement | SVGElement | null) => {
		if (props.nodeRef) props.nodeRef.current = value as HTMLElement | null;
		assignRef(child.props.ref as StructuralRef<HTMLElement | SVGElement> | undefined, value);
	};
	const cloned = cloneElement(child, {
		...transform,
		ref,
		className: clsx(child.props.className ?? child.props.class, props.defaultClassName, {
			[props.defaultClassNameDragging]: state.dragging,
			[props.defaultClassNameDragged]: state.dragged,
		}),
	});
	return (DraggableCore as unknown as (props: Partial<DraggableCoreProps>) => ElementDescriptor)({
		...props,
		nodeRef,
		onStart,
		onDrag,
		onStop,
		children: cloned,
	});
}

const Draggable = DraggableImpl as
	typeof DraggableImpl & {
		displayName?: string;
		defaultProps: DraggableProps;
		propTypes?: Record<string, unknown>;
	};
Draggable.displayName = 'Draggable';
Draggable.defaultProps = { ...DraggableCore.defaultProps, ...defaults } as DraggableProps;

export { Draggable };
export default descriptorChildren(Draggable);
