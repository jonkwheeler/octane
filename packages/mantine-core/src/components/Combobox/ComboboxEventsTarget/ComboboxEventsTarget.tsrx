import type { OctaneNode } from 'octane';
import { useMergedRef } from '@octanejs/mantine-hooks';
import { factory, Factory, useProps } from '../../../core';
import { useComboboxContext } from '../Combobox.context';
import { useComboboxTargetProps } from '../use-combobox-target-props/use-combobox-target-props';

export interface ComboboxEventsTargetProps {
  /** Target element */
  children: OctaneNode;

  /** Key of the prop is used to access element ref */
  refProp?: string;

  /** If set, the component responds to the keyboard events @default true */
  withKeyboardNavigation?: boolean;

  /** If set, the target has `aria-` attributes @default true */
  withAriaAttributes?: boolean;

  /** If set, the target has `aria-expanded` attribute @default false */
  withExpandedAttribute?: boolean;

  /** Determines which events should be handled by the target element.
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
} satisfies Partial<ComboboxEventsTargetProps>;

export type ComboboxEventsTargetFactory = Factory<{
  props: ComboboxEventsTargetProps;
  ref: HTMLElement;
  compound: true;
}>;

export const ComboboxEventsTarget = factory<ComboboxEventsTargetFactory>((props) => {
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
  } = useProps('ComboboxEventsTarget', defaultProps, props);

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
    ref: useMergedRef(ref, ctx.store.targetRef),
    style: { display: 'inline-flex', ...(others as any).style },
  });

  return <span {...wrapperProps}>{children}</span>;
});

ComboboxEventsTarget.displayName = '@mantine/core/ComboboxEventsTarget';
