import type { OctaneNode } from 'octane';
export interface StepperCompletedProps {
  /** Label content */
  children: OctaneNode;
}

export const StepperCompleted: OctaneComponent<StepperCompletedProps> = () => null;
StepperCompleted.displayName = '@mantine/core/StepperCompleted';
