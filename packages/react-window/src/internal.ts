// Octane appends a compiler-owned hook slot to public hook calls. Binding
// internals derive stable child slots so composed hooks and sibling
// virtualizers never share state.
export const S = Symbol.for('octane.hook-slot');

const subSlotCache = new Map<symbol, Map<string, symbol>>();

export function splitSlot(args: unknown[]): [unknown[], symbol | undefined] {
	if (typeof args.at(-1) === 'symbol') return [args.slice(0, -1), args.at(-1) as symbol];
	return [args, undefined];
}

export function subSlot(slot: symbol | undefined, tag: string): symbol {
	if (slot === undefined) return Symbol(tag);
	let byTag = subSlotCache.get(slot);
	if (byTag === undefined) {
		byTag = new Map();
		subSlotCache.set(slot, byTag);
	}
	let child = byTag.get(tag);
	if (child === undefined) {
		child = Symbol(tag);
		byTag.set(tag, child);
	}
	return child;
}
