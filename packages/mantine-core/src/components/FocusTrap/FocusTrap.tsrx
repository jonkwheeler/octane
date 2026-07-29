import type { Octane } from 'octane/jsx-runtime';
import type { ElementDescriptor } from 'octane';
import { useFocusTrap, useMergedRef } from '@octanejs/mantine-hooks';
import { VisuallyHidden } from '../VisuallyHidden';

export interface FocusTrapProps {
  /** Element to trap focus at, must support ref prop */
  children: any;

  /** If set to `false`, disables focus trap */
  active?: boolean;

  /** Prop that is used to access element ref @default 'ref' */
  refProp?: string;

  /** Ref to combine with the focus trap ref */
  innerRef?: OctaneRef<any>;
}

export function FocusTrap({
  children,
  active = true,
  refProp = 'ref',
  innerRef,
}: FocusTrapProps): ElementDescriptor {
  const focusTrapRef = useFocusTrap(active);
  const ref = useMergedRef(focusTrapRef, innerRef);

  return (
    <div ref={ref} style={{ display: 'contents' }}>
      {children}
    </div>
  );
}

export function FocusTrapInitialFocus(props: MantineIntrinsicProps<'span'>) {
  return <VisuallyHidden tabIndex={-1} data-autofocus {...props} />;
}

FocusTrap.displayName = '@mantine/core/FocusTrap';
FocusTrapInitialFocus.displayName = '@mantine/core/FocusTrapInitialFocus';
FocusTrap.InitialFocus = FocusTrapInitialFocus;

export declare namespace FocusTrap {
  export type Props = FocusTrapProps;
}
