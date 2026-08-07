import { useEffect } from 'octane';
import { resolveHookSlot } from './slot';
import type { OnViewportChange } from '@xyflow/system';

import { useStoreApi } from './useStore';

export type UseOnViewportChangeOptions = {
  /** Gets called when the viewport starts changing. */
  onStart?: OnViewportChange;
  /** Gets called when the viewport changes. */
  onChange?: OnViewportChange;
  /** Gets called when the viewport stops changing. */
  onEnd?: OnViewportChange;
};

/**
 * The `useOnViewportChange` hook lets you listen for changes to the viewport such
 * as panning and zooming. You can provide a callback for each phase of a viewport
 * change: `onStart`, `onChange`, and `onEnd`.
 *
 * @public
 * @example
 * ```jsx
 *import { useCallback } from 'octane';
 *import { useOnViewportChange } from '@xyflow/react';
 *
 *function ViewportChangeLogger() {
 *  useOnViewportChange({
 *    onStart: (viewport: Viewport) => console.log('start', viewport),
 *    onChange: (viewport: Viewport) => console.log('change', viewport),
 *    onEnd: (viewport: Viewport) => console.log('end', viewport),
 *  });
 *
 *  return null;
 *}
 *```
 */
export function useOnViewportChange(
  { onStart, onChange, onEnd }: UseOnViewportChangeOptions,
  ...rest: [slot?: symbol]
) {
  const slot = resolveHookSlot(rest);
  const store = useStoreApi(slot);

  useEffect(function setOnStart() {
    store.setState({ onViewportChangeStart: onStart });
  }, [onStart], slot);

  useEffect(function setOnChange() {
    store.setState({ onViewportChange: onChange });
  }, [onChange], slot);

  useEffect(function setOnEnd() {
    store.setState({ onViewportChangeEnd: onEnd });
  }, [onEnd], slot);
}
