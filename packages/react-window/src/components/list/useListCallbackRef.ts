import { useState } from 'octane';
import { getSlot, subSlot } from '../../internal';
import type { ListImperativeAPI } from './types';

/**
 * Convenience hook to return a properly typed ref callback for the List component.
 *
 * Use this hook when you need to share the ref with another component or hook.
 */
export function useListCallbackRef(...rest: unknown[]) {
	const slot = getSlot(rest);
	return useState<ListImperativeAPI | null>(null, subSlot(slot, 'list-callback-ref'));
}
