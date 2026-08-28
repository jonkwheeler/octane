export function compilerSlotSafe(hook) {
	const wrapped = function () {
		const args = Array.from(arguments);
		if (typeof args.at(-1) === 'symbol') args.pop();
		return hook.apply(this, args);
	};
	Object.defineProperty(wrapped, 'name', { value: hook.name, configurable: true });
	Object.defineProperty(wrapped, 'length', { value: hook.length, configurable: true });
	return wrapped;
}
