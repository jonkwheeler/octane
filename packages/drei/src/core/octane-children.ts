import { isChildrenBlock } from 'octane';

export function isRenderFunction(value: unknown): value is (...args: any[]) => unknown {
	return typeof value === 'function' && !isChildrenBlock(value);
}
