import type { OctaneNode } from 'octane';
import { useProps } from '../../../core';
import { useContextMenuHandlers } from '../../../utils/Floating/use-context-menu-handlers';
import { usePopoverContext } from '../Popover.context';

export interface PopoverContextMenuProps {
  /** Element that opens the popover when right-clicked. Dropdown is positioned at the cursor. The trigger element must not call `event.preventDefault()` in its own `onContextMenu` handler, otherwise the native context menu is not suppressed. */
  children: OctaneNode;

  /** If set, the right-click trigger is disabled and the browser's default context menu is shown */
  disabled?: boolean;

  /** Delay in ms before a touch long-press opens the dropdown on touch devices, `500` by default */
  longPressDelay?: number;
}

export function PopoverContextMenu(props: PopoverContextMenuProps) {
  const { children, disabled, longPressDelay } = useProps('PopoverContextMenu', null, props);

  const ctx = usePopoverContext();

  const handlers = useContextMenuHandlers({
    childProps: {},
    disabled: disabled || ctx.disabled,
    opened: ctx.opened,
    longPressDelay,
    setReference: ctx.reference as unknown as (node: object) => void,
    open: () => {
      if (!ctx.opened) {
        ctx.onToggle();
      }
    },
  });

  const wrapperProps: any = Object.assign({}, handlers, { style: { display: 'contents' } });
  return <span {...wrapperProps}>{children}</span>;
}

PopoverContextMenu.displayName = '@mantine/core/PopoverContextMenu';
