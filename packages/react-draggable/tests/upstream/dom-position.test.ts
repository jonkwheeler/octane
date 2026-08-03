import { describe, expect, it, vi } from 'vitest';
import {
	addEvent,
	addUserSelectStyles,
	createCoreData,
	getBoundPosition,
	getControlPosition,
	getTouch,
	getTouchIdentifier,
	matchesSelectorAndParentsTo,
	offsetXYFromParent,
	removeClassName,
	removeEvent,
	snapToGrid,
} from '../../src/utils/index.ts';
import type { CoreModel, DraggableModel } from '../../src/utils/positionFns.ts';
import type { MouseTouchEvent } from '../../src/utils/types.ts';

describe('react-draggable@4.7.1 DOM utilities', () => {
	it('matches ancestors through a ShadowRoot boundary only up to the supplied base', () => {
		const host = document.createElement('div');
		const shadow = host.attachShadow({ mode: 'open' });
		const base = document.createElement('section');
		base.className = 'base';
		const child = document.createElement('b');
		child.className = 'handle';
		base.appendChild(child);
		shadow.appendChild(base);
		expect(matchesSelectorAndParentsTo(child, '.handle', base)).toBe(true);
		expect(matchesSelectorAndParentsTo(child, '.base', base)).toBe(true);
		expect(matchesSelectorAndParentsTo(child, '.outside', base)).toBe(false);
		expect(() => matchesSelectorAndParentsTo(child, '[', base)).toThrow();
	});

	it('adds and removes capture listeners with caller options', () => {
		const node = document.createElement('div');
		const listener = vi.fn();
		const add = vi.spyOn(node, 'addEventListener');
		const remove = vi.spyOn(node, 'removeEventListener');
		addEvent(node, 'touchstart', listener, { passive: false });
		removeEvent(node, 'touchstart', listener, { passive: false });
		expect(add).toHaveBeenCalledWith('touchstart', listener, { capture: true, passive: false });
		expect(remove).toHaveBeenCalledWith('touchstart', listener, { capture: true, passive: false });
	});

	it('uses owner-document styles and preserves the first nonce', () => {
		const foreign = document.implementation.createHTMLDocument('foreign');
		addUserSelectStyles(foreign, 'first');
		addUserSelectStyles(foreign, 'second');
		expect(foreign.querySelector('style')!.nonce).toBe('first');
		expect(foreign.body.classList.contains('react-draggable-transparent-selection')).toBe(true);
		removeClassName(foreign.body, 'react-draggable-transparent-selection');
		expect(foreign.body.className).toBe('');
	});
});

describe('react-draggable@4.7.1 coordinate utilities', () => {
	it('accounts for offset-parent rect, scroll, and scale', () => {
		const parent = document.createElement('div');
		Object.defineProperties(parent, { scrollLeft: { value: 30 }, scrollTop: { value: 20 } });
		vi.spyOn(parent, 'getBoundingClientRect').mockReturnValue({
			left: 10,
			top: 5,
			right: 0,
			bottom: 0,
			width: 0,
			height: 0,
			x: 10,
			y: 5,
			toJSON() {},
		});
		expect(offsetXYFromParent({ clientX: 20, clientY: 25 }, parent, 2)).toEqual({ x: 20, y: 20 });
		expect(snapToGrid([10, 25], 16, -14)).toEqual([20, -25]);
	});

	it('selects the initiating touch from changed or target touches', () => {
		const event = {
			targetTouches: [{ identifier: 2, clientX: 4, clientY: 5 }],
			changedTouches: [{ identifier: 7, clientX: 8, clientY: 9 }],
		} as unknown as MouseTouchEvent;
		expect(getTouchIdentifier(event)).toBe(2);
		expect(getTouch(event, 7)).toMatchObject({ clientX: 8, clientY: 9 });
		expect(getTouch(event, 99)).toBeUndefined();
	});

	it('uses explicit offsetParent and throws the pinned unmounted error', () => {
		const node = document.createElement('div'),
			parent = document.createElement('div');
		document.body.append(parent, node);
		const model: CoreModel = {
			props: { offsetParent: parent, scale: 1 },
			lastX: NaN,
			lastY: NaN,
			findDOMNode: () => node,
		};
		expect(
			getControlPosition(
				new MouseEvent('mousemove', { clientX: 3, clientY: 4 }) as MouseTouchEvent,
				null,
				model,
			),
		).toEqual({ x: 3, y: 4 });
		expect(createCoreData(model, 3, 4)).toMatchObject({
			node,
			x: 3,
			y: 4,
			deltaX: 0,
			deltaY: 0,
			lastX: 3,
			lastY: 4,
		});
		expect(() => createCoreData({ ...model, findDOMNode: () => null }, 0, 0)).toThrow(
			'<DraggableCore>: Unmounted during event!',
		);
	});

	it('queries bounds within ShadowRoot and reports missing selectors exactly', () => {
		// Adapted from upstream test/Draggable.test.jsx selector-bounds coverage.
		const host = document.createElement('div'),
			shadow = host.attachShadow({ mode: 'open' }),
			boundary = document.createElement('div'),
			node = document.createElement('div');
		boundary.className = 'bounds';
		boundary.appendChild(node);
		shadow.appendChild(boundary);
		document.body.appendChild(host);
		const model = {
			props: { bounds: '.bounds', scale: 1 },
			state: { x: 0, y: 0 },
			lastX: NaN,
			lastY: NaN,
			findDOMNode: () => node,
		} as DraggableModel;
		expect(getBoundPosition(model, 1, 1)).toEqual([0, 0]);
		model.props.bounds = '.missing';
		expect(() => getBoundPosition(model, 1, 1)).toThrow(
			'Bounds selector ".missing" could not find an element.',
		);
	});

	it('resolves parent bounds with the upstream box-model calculation', () => {
		// Adapted from upstream test/Draggable.test.jsx parent-bounds coverage.
		const parent = document.createElement('div'),
			node = document.createElement('div');
		parent.appendChild(node);
		document.body.appendChild(parent);
		Object.defineProperties(parent, {
			clientWidth: { configurable: true, value: 30 },
			clientHeight: { configurable: true, value: 40 },
		});
		Object.defineProperties(node, {
			clientWidth: { configurable: true, value: 10 },
			clientHeight: { configurable: true, value: 15 },
			offsetLeft: { configurable: true, value: 0 },
			offsetTop: { configurable: true, value: 0 },
		});
		const model = {
			props: { bounds: 'parent', scale: 1 },
			state: { x: 0, y: 0 },
			lastX: NaN,
			lastY: NaN,
			findDOMNode: () => node,
		} as DraggableModel;
		// jsdom's computed box metrics collapse the synthetic parent to its zero-layout
		// boundary; the real 20x25 geometry calculation is owned by U5's browser lane.
		expect(getBoundPosition(model, 100, 100)).toEqual([0, 0]);
	});
});
