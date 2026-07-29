import type { OctaneNode } from 'octane';
import { useMergedRef } from '@octanejs/mantine-hooks';
import { factory, Factory, useProps } from '../../../core';
import { Popover } from '../../Popover';
import { useComboboxContext } from '../Combobox.context';
import { useComboboxTargetProps } from '../use-combobox-target-props/use-combobox-target-props';

export interface ComboboxTargetProps {
  /** Target element */
  children: OctaneNode;

  /** Key of the prop that is used to access element ref */
  refProp?: string;

  /** If set, the component responds to keyboard events @default true */
  withKeyboardNavigation?: boolean;

  /** If set, the target has `aria-` attributes @default true */
  withAriaAttributes?: boolean;

  /** If set, the target has `aria-expanded` attribute @default false */
  withExpandedAttribute?: boolean;

  /** Determines which events is handled by the target element.
   * `button` target type handles `Space` and `Enter` keys to toggle dropdown opened state.
   * @default input
   * */
  targetType?: 'button' | 'input';

  /** Input autocomplete attribute */
  autoComplete?: string;
}

const defaultProps = {
  refProp: 'ref',
  targetType: 'input',
  withKeyboardNavigation: true,
  withAriaAttributes: true,
  withExpandedAttribute: false,
  autoComplete: 'off',
} satisfies Partial<ComboboxTargetProps>;

export type ComboboxTargetFactory = Factory<{
  props: ComboboxTargetProps;
  ref: HTMLElement;
  compound: true;
}>;

export const ComboboxTarget = factory<ComboboxTargetFactory>((props) => {
  const {
    children,
    refProp,
    withKeyboardNavigation,
    withAriaAttributes,
    withExpandedAttribute,
    targetType,
    autoComplete,
    ref,
    ...others
  } = useProps('ComboboxTarget', defaultProps, props);

  const ctx = useComboboxContext();

  const targetProps = useComboboxTargetProps({
    targetType,
    withAriaAttributes,
    withKeyboardNavigation,
    withExpandedAttribute,
    onKeyDown: undefined,
    onClick: undefined,
    autoComplete,
  });
  const wrapperProps: any = Object.assign({}, targetProps, others, {
    style: { display: 'inline-flex', ...(others as any).style },
  });

  return (
    <Popover.Target refProp={refProp} ref={useMergedRef(ref, ctx.store.targetRef)}>
      <span {...wrapperProps}>{children}</span>
    </Popover.Target>
  );
});

ComboboxTarget.displayName = '@mantine/core/ComboboxTarget';
