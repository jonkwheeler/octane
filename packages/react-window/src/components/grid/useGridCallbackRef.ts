import { useState } from 'octane';
import { getSlot, subSlot } from '../../internal';
import type { GridImperativeAPI } from './types';

/**
 * Convenience hook to return a properly typed ref callback for the Grid component.
 *
 * Use this hook when you need to share the ref with another component or hook.
 */
export function useGridCallbackRef(...rest: unknown[]) {
	const slot = getSlot(rest);
	return useState<GridImperativeAPI | null>(null, subSlot(slot, 'grid-callback-ref'));
}
