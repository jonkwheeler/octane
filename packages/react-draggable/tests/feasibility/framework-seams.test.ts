import { createElement } from 'octane';
import { describe, expect, it, vi } from 'vitest';
import {
	assignRef,
	cloneCoreChild,
	createActiveDrag,
	installTouchStart,
	preventTouchScroll,
	requireMountedNode,
	resolveNode,
	transformForNode,
} from '../../src/internal.js';

describe('react-draggable feasibility: Octane observable seams', () => {
	// Sources: upstream/tag/lib/DraggableCore.tsx render(), findDOMNode(),
	// componentDidMount(), handleDrag(), handleDragStop(), and upstream/tag/lib/Draggable.tsx render().
	it('requires an explicit nodeRef without consulting findDOMNode', () => {
		expect(resolveNode()).toBeNull();
		expect(resolveNode(null)).toBeNull();
		const node = document.createElement('div');
		expect(resolveNode({ current: node })).toBe(node);
		expect(() => requireMountedNode()).toThrow('<DraggableCore> not mounted on DragStart!');
		expect(requireMountedNode({ current: node })).toBe(node);
	});

	it('forwards structural object and callback refs', () => {
		const node = document.createElement('div');
		const objectRef = { current: null as HTMLDivElement | null };
		const callbackRef = vi.fn();
		assignRef(objectRef, node);
		assignRef(callbackRef, node);
		expect(objectRef.current).toBe(node);
		expect(callbackRef).toHaveBeenCalledWith(node);
	});

	it('keeps the one child identity props and ref while replacing upstream handlers', () => {
		const ref = { current: null };
		const oldDown = vi.fn();
		const oldUp = vi.fn();
		const oldEnd = vi.fn();
		const replacement = { onMouseDown: vi.fn(), onMouseUp: vi.fn(), onTouchEnd: vi.fn() };
		const child = createElement('div', {
			id: 'target', className: 'child', style: { color: 'red' }, ref,
			onMouseDown: oldDown, onMouseUp: oldUp, onTouchEnd: oldEnd,
		});
		const clone = cloneCoreChild(child, replacement);
		expect(clone.type).toBe(child.type);
		expect(clone.props).toMatchObject({ id: 'target', className: 'child', style: { color: 'red' }, ref });
		expect(clone.props.onMouseDown).toBe(replacement.onMouseDown);
		expect(clone.props.onMouseUp).toBe(replacement.onMouseUp);
		expect(clone.props.onTouchEnd).toBe(replacement.onTouchEnd);
		expect(() => cloneCoreChild([child, child])).toThrow(/single element/);
	});

	it('installs cancelable touchstart only when a nodeRef resolves', () => {
		const node = document.createElement('div');
		const add = vi.spyOn(node, 'addEventListener');
		const listener = vi.fn();
		expect(installTouchStart(null, listener)).toBeUndefined();
		const cleanup = installTouchStart(node, listener)!;
		expect(add).toHaveBeenCalledWith('touchstart', listener, { capture: true, passive: false });
		const blocked = new Event('touchstart', { cancelable: true }) as TouchEvent;
		preventTouchScroll(blocked);
		expect(blocked.defaultPrevented).toBe(true);
		const allowed = new Event('touchstart', { cancelable: true }) as TouchEvent;
		preventTouchScroll(allowed, true);
		expect(allowed.defaultPrevented).toBe(false);
		cleanup();
	});

	it('pins ownerDocument/listener identity while reading active props live', () => {
		const foreign = document.implementation.createHTMLDocument('foreign');
		const node = foreign.createElement('div');
		foreign.body.appendChild(node);
		const first = vi.fn();
		const second = vi.fn();
		let props = { onDrag: first, disabled: false, grid: [1, 1] as const, scale: 1 };
		let currentNode: Node = node;
		const drag = createActiveDrag(() => props, () => currentNode);
		const moveIdentity = drag.move;
		drag.start(node);
		expect(drag.ownerDocument).toBe(foreign);
		foreign.dispatchEvent(new MouseEvent('mousemove'));
		props = { onDrag: second, disabled: false, grid: [10, 10], scale: 2 };
		foreign.dispatchEvent(new MouseEvent('mousemove'));
		expect(first).toHaveBeenCalledTimes(1);
		expect(second).toHaveBeenCalledTimes(1);
		expect(drag.move).toBe(moveIdentity);
		drag.finish();
		foreign.dispatchEvent(new MouseEvent('mousemove'));
		expect(second).toHaveBeenCalledTimes(1);
	});

	it('characterizes upstream ref replacement retaining original-document resources', () => {
		const original = document.implementation.createHTMLDocument('original');
		const replacement = document.implementation.createHTMLDocument('replacement');
		const originalNode = original.createElement('div');
		const replacementNode = replacement.createElement('div');
		let currentNode: Node = originalNode;
		const onDrag = vi.fn();
		const drag = createActiveDrag(() => ({ onDrag }), () => currentNode);
		drag.start(originalNode);
		currentNode = replacementNode;
		drag.finish();
		original.dispatchEvent(new MouseEvent('mousemove'));
		expect(onDrag).toHaveBeenCalledTimes(1);
	});

	it('chooses HTML style versus SVG transform from the adopted node after mount', () => {
		expect(transformForNode(document.createElement('div'), { x: 3, y: 4 })).toEqual({ style: { transform: 'translate(3px,4px)' } });
		expect(transformForNode(document.createElementNS('http://www.w3.org/2000/svg', 'g'), { x: 3, y: 4 })).toEqual({ transform: 'translate(3,4)' });
	});
});
