import { useRef } from 'octane';
import { splitSlot, subSlot } from '../../internal';
import type { GridImperativeAPI } from './types';

/**
 * Convenience hook to return a properly typed ref for the Grid component.
 */
export function useGridRef(...rest: unknown[]) {
	const [, slot] = splitSlot(rest);
	return useRef<GridImperativeAPI | null>(null, subSlot(slot, 'grid-ref'));
}
