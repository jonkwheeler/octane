import { use } from 'octane';
import { useProps } from '../../../core';
import { Popover, PopoverTargetProps } from '../../Popover';
import { useHoverCardContext } from '../HoverCard.context';
import { HoverCardGroupContext } from '../HoverCardGroup/HoverCardGroup.tsrx';

export interface HoverCardTargetProps extends PopoverTargetProps {
  /**
   * Name of the prop to wrap event listeners in.
   * Use when the target component expects event listeners in a nested object.
   * For example, some components expect `componentProps={{ onMouseEnter, onMouseLeave }}`.
   * @default undefined (event listeners passed directly to component)
   */
  eventPropsWrapperName?: string;
}

const defaultProps = {
  refProp: 'ref',
} satisfies Partial<HoverCardTargetProps>;

export function HoverCardTarget(props: HoverCardTargetProps) {
  const { children, refProp, eventPropsWrapperName, ...others } = useProps(
    'HoverCardTarget',
    defaultProps,
    props
  );

  const ctx = useHoverCardContext();
  const groupContext = use(HoverCardGroupContext);

  if (groupContext.withinGroup && ctx.getReferenceProps && ctx.reference) {
    const referenceProps = ctx.getReferenceProps();
    const wrapperProps: any = Object.assign({}, referenceProps, {
      ref: ctx.reference,
      style: { display: 'inline-flex', ...(referenceProps as any).style },
    });

    return (
      <Popover.Target refProp={refProp} {...others}>
        <span {...wrapperProps}>{children}</span>
      </Popover.Target>
    );
  }

  const wrapperProps: any = {
    onMouseEnter: ctx.openDropdown,
    onMouseLeave: ctx.closeDropdown,
    ref: ctx.assignTarget,
    style: { display: 'inline-flex' },
  };

  return (
    <Popover.Target refProp={refProp} {...others}>
      <span {...wrapperProps}>{children}</span>
    </Popover.Target>
  );
}

HoverCardTarget.displayName = '@mantine/core/HoverCardTarget';
