import type { OctaneNode } from 'octane';
import { createContext } from 'octane';
import { FloatingDelayGroup } from '@octanejs/floating-ui';
import { ExtendComponent, Factory, MantineThemeComponent, useProps } from '../../../core';

export interface TooltipGroupContextValue {
  withinGroup: boolean;
}

export const TooltipGroupContext = createContext<TooltipGroupContextValue>({ withinGroup: false });

export interface TooltipGroupProps {
  /** `Tooltip` components */
  children: OctaneNode;

  /** Open delay in ms */
  openDelay?: number;

  /** Close delay in ms */
  closeDelay?: number;
}

const defaultProps = {
  openDelay: 0,
  closeDelay: 0,
} satisfies Partial<TooltipGroupProps>;

export function TooltipGroup(props: TooltipGroupProps) {
  const { openDelay, closeDelay, children } = useProps('TooltipGroup', defaultProps, props);

  return (
    <TooltipGroupContext value={{ withinGroup: true }}>
      <FloatingDelayGroup delay={{ open: openDelay, close: closeDelay }}>
        {children}
      </FloatingDelayGroup>
    </TooltipGroupContext>
  );
}

export type TooltipGroupFactory = Factory<{
  props: TooltipGroupProps;
}>;

TooltipGroup.displayName = '@mantine/core/TooltipGroup';
TooltipGroup.extend = (c: ExtendComponent<TooltipGroupFactory>): MantineThemeComponent => c;
