import { assignRef, useMask, useMergedRef } from '@octanejs/mantine-hooks';
import type { MaskInputProps } from './MaskInput.tsrx';

export function useMaskInputProps(props: MaskInputProps & { ref?: OctaneRef<HTMLInputElement> }) {
  const {
    mask,
    tokens,
    modify,
    separate,
    slotChar,
    alwaysShowMask,
    showMaskOnFocus,
    transform,
    autoClear,
    onChangeRaw,
    onComplete,
    beforeMaskedStateChange,
    resetRef,
    ref,
    ...elementProps
  } = props;

  const { ref: maskCallbackRef, reset } = useMask({
    mask,
    tokens,
    modify,
    separate,
    slotChar,
    alwaysShowMask,
    showMaskOnFocus,
    transform,
    autoClear,
    onChangeRaw,
    onComplete,
    beforeMaskedStateChange,
  });

  assignRef(resetRef, reset);

  const maskRef = useMergedRef(ref, maskCallbackRef);

  return { maskRef, elementProps };
}
