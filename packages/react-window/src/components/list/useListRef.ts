import { useRef } from 'octane';
import { getSlot, subSlot } from '../../internal';
import type { ListImperativeAPI } from './types';

/**
 * Convenience hook to return a properly typed ref for the List component.
 */
export function useListRef(...rest: unknown[]) {
	const slot = getSlot(rest);
	return useRef<ListImperativeAPI | null>(null, subSlot(slot, 'list-ref'));
}
