import type { OctaneNode } from 'octane';
import { useProps } from '../../../core';
import { useContextMenuHandlers } from '../../../utils/Floating/use-context-menu-handlers';
import { usePopoverContext } from '../../Popover';
import { useMenuContext } from '../Menu.context';

export interface MenuContextMenuProps {
  /** Element that opens the menu when right-clicked. Menu dropdown is positioned at the cursor. The trigger element must not call `event.preventDefault()` in its own `onContextMenu` handler, otherwise the native context menu is not suppressed. */
  children: OctaneNode;

  /** If set, the right-click trigger is disabled and the browser's default context menu is shown */
  disabled?: boolean;

  /** Delay in ms before a touch long-press opens the dropdown on touch devices, `500` by default */
  longPressDelay?: number;
}

export function MenuContextMenu(props: MenuContextMenuProps) {
  const { children, disabled, longPressDelay } = useProps('MenuContextMenu', null, props);

  const ctx = useMenuContext();
  const popoverCtx = usePopoverContext();

  const handlers = useContextMenuHandlers({
    childProps: {},
    disabled: disabled || popoverCtx.disabled,
    opened: ctx.opened,
    longPressDelay,
    setReference: popoverCtx.reference as unknown as (node: object) => void,
    open: () => ctx.openDropdown(),
  });

  const wrapperProps: any = Object.assign({}, handlers, { style: { display: 'contents' } });
  return <span {...wrapperProps}>{children}</span>;
}

MenuContextMenu.displayName = '@mantine/core/MenuContextMenu';
