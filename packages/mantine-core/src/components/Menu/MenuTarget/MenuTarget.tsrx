import type { OctaneNode } from 'octane';
import { useProps } from '../../../core';
import { Popover } from '../../Popover';
import { useMenuContext } from '../Menu.context';

export interface MenuTargetProps {
  /** Target element */
  children: OctaneNode;

  /** Key of the prop used to get element ref, useful for forwarding refs to custom components @default 'ref' */
  refProp?: string;
}

const defaultProps = {
  refProp: 'ref',
} satisfies Partial<MenuTargetProps>;

export function MenuTarget(props: MenuTargetProps) {
  const { children, refProp, ...others } = useProps('MenuTarget', defaultProps, props);

  const ctx = useMenuContext();
  const onClick = () => {
    if (ctx.trigger === 'click') {
      ctx.toggleDropdown();
    } else if (ctx.trigger === 'click-hover') {
      ctx.setOpenedViaClick(true);
      if (!ctx.opened) {
        ctx.openDropdown();
      }
    }
  };

  const onMouseEnter = () =>
    (ctx.trigger === 'hover' || ctx.trigger === 'click-hover') && ctx.openDropdown();

  const onMouseLeave = () => {
    if (ctx.trigger === 'hover') {
      ctx.closeDropdown();
    } else if (ctx.trigger === 'click-hover' && !ctx.openedViaClick) {
      ctx.closeDropdown();
    }
  };

  return (
    <Popover.Target refProp={refProp} popupType="menu" {...others}>
      <span
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        data-expanded={ctx.opened ? true : undefined}
        style={{ display: 'inline-flex' }}
      >
        {children}
      </span>
    </Popover.Target>
  );
}

MenuTarget.displayName = '@mantine/core/MenuTarget';
