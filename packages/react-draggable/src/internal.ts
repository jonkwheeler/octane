import { Children, cloneElement, type ElementDescriptor, type OctaneNode } from 'octane';

export type StructuralRef<T> = { current: T | null } | ((value: T | null) => void);

export interface CoreLiveProps {
	allowMobileScroll?: boolean;
	disabled?: boolean;
	grid?: readonly [number, number];
	scale?: number;
	onDrag?: (event: MouseEvent | TouchEvent) => void;
	onStop?: (event: MouseEvent | TouchEvent) => void;
}

export function resolveNode<T extends Node>(nodeRef?: { current: T | null } | null): T | null {
	return nodeRef?.current ?? null;
}

export function requireMountedNode<T extends Node>(nodeRef?: { current: T | null } | null): T {
	const node = resolveNode(nodeRef);
	if (!node) throw new Error('<DraggableCore> not mounted on DragStart!');
	return node;
}

export function assignRef<T>(ref: StructuralRef<T> | null | undefined, value: T | null): void {
	if (typeof ref === 'function') ref(value);
	else if (ref) ref.current = value;
}

export function cloneCoreChild(
	child: OctaneNode,
	handlers: { onMouseDown(event: MouseEvent): void; onMouseUp(event: MouseEvent): void; onTouchEnd(event: TouchEvent): void },
): ElementDescriptor {
	return cloneElement(Children.only(child) as ElementDescriptor, handlers);
}

export function installTouchStart(
	node: Node | null,
	listener: EventListener,
): (() => void) | undefined {
	if (!node) return undefined;
	const options: AddEventListenerOptions = { capture: true, passive: false };
	node.addEventListener('touchstart', listener, options);
	return () => node.removeEventListener('touchstart', listener, options);
}

export function preventTouchScroll(event: TouchEvent, allowMobileScroll = false): void {
	if (!allowMobileScroll) event.preventDefault();
}

/** A drag pins its native listener owner while callbacks and calculation props stay live. */
export function createActiveDrag(getProps: () => CoreLiveProps, getCurrentNode: () => Node | null) {
	let owner: Document | null = null;
	const move: EventListener = (event) => {
		const props = getProps();
		if (!props.disabled) props.onDrag?.(event as MouseEvent | TouchEvent);
	};
	const stop: EventListener = (event) => {
		getProps().onStop?.(event as MouseEvent | TouchEvent);
		finish();
	};
	function start(node: Node): void {
		if (owner) return;
		owner = node.ownerDocument;
		owner.addEventListener('mousemove', move, true);
		owner.addEventListener('mouseup', stop, true);
		owner.addEventListener('touchmove', move, true);
		owner.addEventListener('touchend', stop, true);
	}
	function finish(): void {
		if (!owner) return;
		// Upstream pins registration to the start node's document, but resolves
		// findDOMNode/nodeRef again during stop. A cross-document ref replacement
		// therefore removes from the new document and retains the original listeners.
		const cleanupOwner = getCurrentNode()?.ownerDocument;
		owner = null;
		cleanupOwner?.removeEventListener('mousemove', move, true);
		cleanupOwner?.removeEventListener('mouseup', stop, true);
		cleanupOwner?.removeEventListener('touchmove', move, true);
		cleanupOwner?.removeEventListener('touchend', stop, true);
	}
	return { start, finish, move, stop, get ownerDocument() { return owner; } };
}

export function transformForNode(
	node: Element,
	position: { x: number; y: number },
): { style?: { transform: string }; transform?: string } {
	const translation = `translate(${position.x}${node instanceof SVGElement ? '' : 'px'},${position.y}${node instanceof SVGElement ? '' : 'px'})`;
	return node instanceof SVGElement ? { transform: translation } : { style: { transform: translation } };
}
