import {
  useFloating as useFloatingBase,
  type ReferenceType,
  type UseFloatingOptions,
  type UseFloatingReturn,
} from '@octanejs/floating-ui';

const MANTINE_FLOATING_SLOT = Symbol.for('@octanejs/mantine-core:useFloating');

export function useMantineFloating<RT extends ReferenceType = ReferenceType>(
  options?: UseFloatingOptions<RT>,
): UseFloatingReturn<RT> {
  return useFloatingBase(
    options as UseFloatingOptions<ReferenceType> | undefined,
    MANTINE_FLOATING_SLOT,
  ) as UseFloatingReturn<RT>;
}
