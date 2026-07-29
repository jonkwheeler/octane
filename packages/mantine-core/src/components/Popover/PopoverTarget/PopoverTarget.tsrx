import type { OctaneNode } from 'octane';
import cx from 'clsx';
import { useMergedRef } from '@octanejs/mantine-hooks';
import { factory, Factory, useProps } from '../../../core';
import { usePopoverContext } from '../Popover.context';

export interface PopoverTargetProps {
  /** Target element */
  children: OctaneNode;

  /** Key of the prop that should be used to access element ref */
  refProp?: string;

  /** Popup accessible type @default 'dialog' */
  popupType?: string;
}

const defaultProps = {
  refProp: 'ref',
  popupType: 'dialog',
} satisfies Partial<PopoverTargetProps>;

export type PopoverTargetFactory = Factory<{
  props: PopoverTargetProps;
  ref: HTMLElement;
  compound: true;
}>;

export const PopoverTarget = factory<PopoverTargetFactory>((props) => {
  const { children, refProp, popupType, ref, ...others } = useProps(
    'PopoverTarget',
    defaultProps,
    props
  );

  const forwardedProps: any = others;
  const ctx = usePopoverContext();
  const targetRef = useMergedRef(ctx.reference, ref);

  const accessibleProps = ctx.withRoles
    ? {
        'aria-haspopup': popupType,
        'aria-expanded': ctx.opened,
        'aria-controls': ctx.opened ? ctx.getDropdownId() : undefined,
        id: ctx.getTargetId(),
      }
    : {};

  const onClick = (event: OctaneMouseEvent<HTMLElement>) => {
    ctx.targetProps.onClick?.(event as any);
    if (!event.defaultPrevented && !ctx.controlled) {
      ctx.onToggle();
    }
  };
  const wrapperProps: any = Object.assign(
    {},
    forwardedProps,
    accessibleProps,
    ctx.targetProps,
    {
      className: cx(ctx.targetProps.className, forwardedProps.className),
      style: { display: 'inline-flex', ...ctx.targetProps.style, ...forwardedProps.style },
      ref: targetRef,
      onClick,
    },
  );

  return (
    <span {...wrapperProps}>
      {children}
    </span>
  );
});

PopoverTarget.displayName = '@mantine/core/PopoverTarget';
