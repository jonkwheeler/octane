const slots = new Map<symbol, Map<string, symbol>>();

export function subSlot(slot: symbol | undefined, tag: string): symbol {
	if (!slot) return Symbol.for(`@octanejs/solana-react:${tag}`);
	let children = slots.get(slot);
	if (!children) slots.set(slot, (children = new Map()));
	let child = children.get(tag);
	if (!child) children.set(tag, (child = Symbol(`${slot.description ?? 'solana'}:${tag}`)));
	return child;
}

export function splitSlot(args: unknown[]): [unknown[], symbol | undefined] {
	const tail = args.at(-1);
	return typeof tail === 'symbol' ? [args.slice(0, -1), tail] : [args, undefined];
}
