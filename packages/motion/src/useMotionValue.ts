// `useMotionValue(initial)` — a stable, reactive animatable value (reuses motion's
// `motionValue`). Bind it to a `motion.*` element via `style={{ x: mv }}`; the
// element subscribes and updates without re-rendering (see the style-binding effect
// in index.ts).
import { motionValue } from 'motion';
import { useState } from 'octane';

// Memoized tagless sub-slot (single entry per caller slot) — same interned
// Symbol.for value, minus the per-render concat + registry lookup.
const mvSlotCache = new Map<symbol, symbol>();
function mvSlot(slot: symbol | undefined): symbol | undefined {
	if (slot === undefined) return undefined;
	let sym = mvSlotCache.get(slot);
	if (sym === undefined)
		mvSlotCache.set(slot, (sym = Symbol.for((slot.description ?? '') + ':mv')));
	return sym;
}

export function useMotionValue<T>(initial: T, ...args: any[]): any {
	const tail = args[args.length - 1];
	const slot = typeof tail === 'symbol' ? (tail as symbol) : undefined;
	const [mv] = useState(() => motionValue(initial), mvSlot(slot));
	return mv;
}

// A MotionValue duck-typed (reactive get/set/subscribe).
export function isMotionValue(v: any): boolean {
	return v != null && typeof v.get === 'function' && typeof v.on === 'function';
}

// Transform shorthands → CSS transform functions (matching Framer Motion).
const TRANSFORM_FN: Record<string, string> = {
	x: 'translateX',
	y: 'translateY',
	z: 'translateZ',
	scale: 'scale',
	scaleX: 'scaleX',
	scaleY: 'scaleY',
	rotate: 'rotate',
	rotateX: 'rotateX',
	rotateY: 'rotateY',
	rotateZ: 'rotateZ',
	skewX: 'skewX',
	skewY: 'skewY',
};
const PX_KEYS = new Set(['x', 'y', 'z']);
const DEG_KEYS = new Set(['rotate', 'rotateX', 'rotateY', 'rotateZ', 'skewX', 'skewY']);
const NO_UNIT = new Set(['opacity', 'zIndex', 'scale', 'scaleX', 'scaleY']);

export function isTransformKey(k: string): boolean {
	return k in TRANSFORM_FN;
}

function unitizeTransformValue(key: string, val: any): string {
	if (typeof val !== 'number') return String(val);
	if (PX_KEYS.has(key)) return `${val}px`;
	if (DEG_KEYS.has(key)) return `${val}deg`;
	return `${val}`;
}

/** Patch one transform function into the live CSS string without wiping others. */
export function patchTransformFn(node: HTMLElement, key: string, val: any): void {
	const fn = TRANSFORM_FN[key];
	if (!fn) return;
	const next = `${fn}(${unitizeTransformValue(key, val)})`;
	const current = node.style.transform || '';
	const re = new RegExp(`${fn}\\([^)]*\\)`);
	if (!current || current === 'none') {
		node.style.transform = next;
		return;
	}
	node.style.transform = re.test(current)
		? current.replace(re, next).trim()
		: `${current} ${next}`.trim();
}

/** Remove one transform function from the live CSS string. */
export function removeTransformFn(node: HTMLElement, key: string): void {
	const fn = TRANSFORM_FN[key];
	if (!fn) return;
	const current = node.style.transform || '';
	if (!current || current === 'none') return;
	node.style.transform = current.replace(new RegExp(`\\s*${fn}\\([^)]*\\)\\s*`), ' ').trim();
}

// Apply one style/transform value to the element. Transform shorthands patch the
// live `transform` string in place so animate/layout/drag values survive rebinds.
export function applyStyleValue(
	node: HTMLElement,
	key: string,
	val: any,
	_transformState?: Record<string, any>,
): void {
	if (TRANSFORM_FN[key]) {
		if (_transformState) _transformState[key] = val;
		patchTransformFn(node, key, val);
	} else {
		(node.style as any)[key] = typeof val === 'number' && !NO_UNIT.has(key) ? `${val}px` : val;
	}
}
