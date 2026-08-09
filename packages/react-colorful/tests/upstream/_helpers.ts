import { afterEach, vi } from 'vitest';
import { fireEvent } from '@testing-library/react';
import { delegateEvents, flushSync } from 'octane';
import { flushEffects, mount } from '../../../octane/tests/_helpers';

delegateEvents([
	'mousedown',
	'mouseup',
	'mousemove',
	'touchstart',
	'touchmove',
	'touchend',
	'keydown',
	'keyup',
]);

const roots: Array<{ unmount: () => void }> = [];

export function mountTracked(...args: Parameters<typeof mount<any>>) {
	const root = mount<any>(...args);
	roots.push(root);
	return root;
}

export function settle() {
	flushEffects();
	flushSync(function flush() {});
}

/** Match upstream tests/components.test.js getBoundingClientRect mock. */
export function mockPickerGeometry() {
	vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function rect() {
		return {
			x: 5,
			y: 5,
			top: 5,
			left: 5,
			right: 105,
			bottom: 105,
			width: 100,
			height: 100,
			toJSON: function toJSON() {
				return {};
			},
		};
	});
}

export function interactive(root: { find: (sel: string) => Element }, label: string) {
	return root.find(`[aria-label="${label}"]`) as HTMLElement;
}

export function mouse(
	target: EventTarget,
	type: string,
	pageX: number,
	pageY: number,
	buttons = 1,
) {
	const event = new MouseEvent(type, {
		bubbles: true,
		cancelable: true,
		buttons,
		clientX: pageX,
		clientY: pageY,
	});
	Object.defineProperty(event, 'pageX', {
		configurable: true,
		get: function getPageX() {
			return pageX;
		},
	});
	Object.defineProperty(event, 'pageY', {
		configurable: true,
		get: function getPageY() {
			return pageY;
		},
	});
	target.dispatchEvent(event);
}

export function touchStart(
	target: Element,
	pageX: number,
	pageY: number,
	identifier = 0,
) {
	fireEvent.touchStart(target, {
		touches: [{ pageX, pageY, clientX: pageX, clientY: pageY, identifier }],
		changedTouches: [{ pageX, pageY, clientX: pageX, clientY: pageY, identifier }],
	});
}

export function touchMove(
	target: Element,
	touches: Array<{ pageX: number; pageY: number; identifier?: number }>,
) {
	const list = touches.map(function mapTouch(entry, index) {
		return {
			identifier: entry.identifier ?? index,
			pageX: entry.pageX,
			pageY: entry.pageY,
			clientX: entry.pageX,
			clientY: entry.pageY,
		};
	});
	fireEvent.touchMove(target, { touches: list, changedTouches: list });
}

export function touchEnd(target: Element) {
	fireEvent.touchEnd(target, { touches: [], changedTouches: [] });
}

afterEach(function cleanup() {
	for (const root of roots.splice(0)) root.unmount();
	vi.restoreAllMocks();
});
