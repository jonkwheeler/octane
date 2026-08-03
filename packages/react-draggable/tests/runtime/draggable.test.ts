import { createRoot, flushSync } from 'octane';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { flushEffects } from '../../../octane/tests/_helpers.ts';
import Draggable, { DraggableCore } from '../../src/index.ts';
import { DraggableHarness, SvgDraggableHarness } from './_fixtures/DraggableHarness.tsrx';

afterEach(() => {
	vi.restoreAllMocks();
	document.body.innerHTML = '';
});

function mount(props: Record<string, unknown> = {}) {
	const container = document.createElement('div');
	document.body.appendChild(container);
	const root = createRoot(container);
	const nodeRef = { current: null as HTMLDivElement | null };
	root.render(DraggableHarness, { nodeRef, enableUserSelectHack: false, ...props });
	flushSync(() => {});
	flushEffects();
	return { root, container, nodeRef, node: nodeRef.current! };
}

function drag(node: Element, points: Array<[number, number]>): void {
	node.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
	for (const [clientX, clientY] of points) {
		document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX, clientY }));
		flushSync(() => {});
	}
}

describe('Draggable visual contract', () => {
	// Adapted from pinned upstream tag test/Draggable.test.jsx rendering,
	// controlled-position, bounds, grid, class, and handler-replacement cases.
	it('exports the pinned root values and clones one child without a wrapper', () => {
		expect(Draggable.displayName).toBe('Draggable');
		expect(typeof DraggableCore).toBe('function');
		const mounted = mount({ defaultPosition: { x: 10, y: 20 } });
		expect(mounted.container.children).toHaveLength(1);
		expect(mounted.node.dataset.kept).toBe('yes');
		expect(mounted.node.className).toBe('child react-draggable');
		expect(mounted.node.style.color).toBe('red');
		expect(mounted.node.style.transform).toBe('translate(10px,20px)');
		mounted.root.unmount();
	});

	it('moves uncontrolled, emits data, applies axis, and retains dragged class', () => {
		const onDrag = vi.fn();
		const mounted = mount({ axis: 'x', onDrag });
		mounted.node.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
		document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 12, clientY: 8 }));
		flushSync(() => {});
		expect(onDrag.mock.calls[0][1]).toMatchObject({ x: 12, y: 8, deltaX: 12, deltaY: 8 });
		expect(mounted.node.style.transform).toBe('translate(12px,0px)');
		document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: 12, clientY: 8 }));
		flushSync(() => {});
		expect(mounted.node.classList.contains('react-draggable-dragged')).toBe(true);
		mounted.root.unmount();
	});

	it('reverts a controlled gesture on stop', () => {
		const mounted = mount({ position: { x: 3, y: 4 }, onStop: vi.fn() });
		mounted.node.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
		document.dispatchEvent(
			new MouseEvent('mousemove', { bubbles: true, clientX: 10, clientY: 10 }),
		);
		flushSync(() => {});
		expect(mounted.node.style.transform).toBe('translate(13px,14px)');
		document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: 10, clientY: 10 }));
		flushSync(() => {});
		expect(mounted.node.style.transform).toBe('translate(3px,4px)');
		mounted.root.unmount();
	});

	it('applies numeric/string position offsets and replaces child drag handlers', () => {
		const childMouseDown = vi.fn(),
			onMouseDown = vi.fn();
		const mounted = mount({
			defaultPosition: { x: 3, y: 4 },
			positionOffset: { x: 10, y: '25%' },
			childMouseDown,
			onMouseDown,
		});
		expect(mounted.node.style.transform).toBe('translate(10px, 25%)translate(3px,4px)');
		mounted.node.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
		expect(onMouseDown).toHaveBeenCalledTimes(1);
		expect(childMouseDown).not.toHaveBeenCalled();
		mounted.root.unmount();
	});

	it('snaps visual and callback coordinates to the configured grid', () => {
		const onDrag = vi.fn();
		const mounted = mount({ grid: [10, 5], onDrag });
		drag(mounted.node, [[14, 8]]);
		expect(onDrag.mock.calls[0][1]).toMatchObject({ x: 10, y: 10, deltaX: 10, deltaY: 10 });
		expect(mounted.node.style.transform).toBe('translate(10px,10px)');
		mounted.root.unmount();
	});

	it('clips object bounds and consumes slack before moving back inside', () => {
		const onDrag = vi.fn();
		const mounted = mount({ bounds: { right: 10 }, onDrag });
		drag(mounted.node, [
			[20, 0],
			[15, 0],
			[10, 0],
			[5, 0],
		]);
		expect(onDrag.mock.calls.map((call) => call[1].x)).toEqual([10, 10, 10, 5]);
		expect(mounted.node.style.transform).toBe('translate(5px,0px)');
		mounted.root.unmount();
	});

	it('switches mounted SVG children to the transform attribute', () => {
		const container = document.createElement('div');
		document.body.appendChild(container);
		const root = createRoot(container);
		const nodeRef = { current: null as SVGSVGElement | null };
		root.render(SvgDraggableHarness, { nodeRef, defaultPosition: { x: 6, y: 7 } });
		flushSync(() => {});
		flushEffects();
		flushSync(() => {});
		expect(nodeRef.current?.getAttribute('transform')).toBe('translate(6,7)');
		expect(nodeRef.current?.style.transform).toBe('');
		root.unmount();
		container.remove();
	});
});
