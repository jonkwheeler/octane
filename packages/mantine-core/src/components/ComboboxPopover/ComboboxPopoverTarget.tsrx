import type { OctaneNode } from 'octane';
import { useMergedRef } from '@octanejs/mantine-hooks';
import { factory, Factory, useProps } from '../../core';
import { useComboboxContext } from '../Combobox/Combobox.context';
import { useComboboxTargetProps } from '../Combobox/use-combobox-target-props/use-combobox-target-props';
import { Popover } from '../Popover';

export interface ComboboxPopoverTargetProps {
  children: OctaneNode;

  /** Key of the prop that is used to access element ref @default 'ref' */
  refProp?: string;
}

const defaultProps = {
  refProp: 'ref',
} satisfies Partial<ComboboxPopoverTargetProps>;

export type ComboboxPopoverTargetFactory = Factory<{
  props: ComboboxPopoverTargetProps;
  ref: HTMLElement;
  compound: true;
}>;

export const ComboboxPopoverTarget = factory<ComboboxPopoverTargetFactory>((props) => {
  const { children, refProp, ref, ...others } = useProps(
    'ComboboxPopoverTarget',
    defaultProps,
    props
  );

  const ctx = useComboboxContext();
  const targetRef = useMergedRef(ref, ctx.store.targetRef);

  const targetProps = useComboboxTargetProps({
    targetType: 'button',
    withAriaAttributes: true,
    withKeyboardNavigation: true,
    withExpandedAttribute: true,
    onKeyDown: undefined,
    onClick: (event) => {
      ctx.store.toggleDropdown();
    },
    autoComplete: 'off',
  });

  const wrapperProps: any = Object.assign({}, targetProps, others, {
    style: { display: 'inline-flex', ...(others as any).style },
  });

  return (
    <Popover.Target refProp={refProp} ref={targetRef}>
      <span {...wrapperProps}>{children}</span>
    </Popover.Target>
  );
});

ComboboxPopoverTarget.displayName = '@mantine/core/ComboboxPopoverTarget';
