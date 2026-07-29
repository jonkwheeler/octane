import type { OctaneNode } from 'octane';
import { Portal } from '../../Portal';
import { useStepperContext } from '../Stepper.context';
export interface StepperCompletedProps {
  /** Label content */
  children: OctaneNode;
}

export const StepperCompleted: OctaneComponent<StepperCompletedProps> = ({ children }) => {
  const ctx = useStepperContext();
  const visible = ctx.isCompleted();
  if (!visible && !ctx.keepMounted) {
    return null;
  }
  if (!ctx.contentTarget) {
    return visible ? <div {...ctx.getStyles('content')}>{children}</div> : null;
  }
  return (
    <Portal target={ctx.contentTarget}>
      <div
        {...ctx.getStyles('content')}
        style={ctx.keepMounted && !visible ? { display: 'none' } : undefined}
      >
        {children}
      </div>
    </Portal>
  );
};
StepperCompleted.displayName = '@mantine/core/StepperCompleted';
