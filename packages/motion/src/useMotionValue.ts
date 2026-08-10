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

// Motion-style CSS transform function order: translate before scale/rotate so
// offsets are not scaled when both are present.
const TRANSFORM_ORDER = [
	'translateX',
	'translateY',
	'translateZ',
	'scale',
	'scaleX',
	'scaleY',
	'rotate',
	'rotateX',
	'rotateY',
	'rotateZ',
	'skewX',
	'skewY',
];

export function isTransformKey(k: string): boolean {
	return k in TRANSFORM_FN;
}

function unitizeTransformValue(key: string, val: any): string {
	if (typeof val !== 'number') return String(val);
	if (PX_KEYS.has(key)) return `${val}px`;
	if (DEG_KEYS.has(key)) return `${val}deg`;
	return `${val}`;
}

/** Locate `fn(...)` with balanced parentheses so nested `calc(...)` survives. */
function findTransformFnRange(
	transform: string,
	fn: string,
): { start: number; end: number } | null {
	const needle = fn + '(';
	let from = 0;
	while (from < transform.length) {
		const idx = transform.indexOf(needle, from);
		if (idx === -1) return null;
		// Prefer a token boundary so `scale(` does not match inside `scaleX(`.
		if (idx > 0 && /\S/.test(transform.charAt(idx - 1))) {
			from = idx + 1;
			continue;
		}
		let depth = 0;
		for (let i = idx + fn.length; i < transform.length; i++) {
			const ch = transform.charAt(i);
			if (ch === '(') depth++;
			else if (ch === ')') {
				depth--;
				if (depth === 0) return { start: idx, end: i + 1 };
			}
		}
		return null;
	}
	return null;
}

function insertTransformFn(current: string, next: string, fn: string): string {
	const orderIdx = TRANSFORM_ORDER.indexOf(fn);
	if (orderIdx === -1) return `${current} ${next}`.trim();
	for (let i = orderIdx + 1; i < TRANSFORM_ORDER.length; i++) {
		const later = findTransformFnRange(current, TRANSFORM_ORDER[i]);
		if (later) {
			const before = current.slice(0, later.start).trimEnd();
			const after = current.slice(later.start).trimStart();
			return before ? `${before} ${next} ${after}` : `${next} ${after}`;
		}
	}
	return `${current} ${next}`.trim();
}

/** Patch one transform function into the live CSS string without wiping others. */
export function patchTransformFn(node: HTMLElement, key: string, val: any): void {
	const fn = TRANSFORM_FN[key];
	if (!fn) return;
	const next = `${fn}(${unitizeTransformValue(key, val)})`;
	const current = node.style.transform || '';
	if (!current || current === 'none') {
		node.style.transform = next;
		return;
	}
	const range = findTransformFnRange(current, fn);
	node.style.transform = range
		? (current.slice(0, range.start) + next + current.slice(range.end)).trim()
		: insertTransformFn(current, next, fn);
}

/** Remove one transform function from the live CSS string. */
export function removeTransformFn(node: HTMLElement, key: string): void {
	const fn = TRANSFORM_FN[key];
	if (!fn) return;
	const current = node.style.transform || '';
	if (!current || current === 'none') return;
	const range = findTransformFnRange(current, fn);
	if (!range) return;
	const before = current.slice(0, range.start).trimEnd();
	const after = current.slice(range.end).trimStart();
	node.style.transform = before && after ? `${before} ${after}` : before || after;
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
