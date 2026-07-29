import { createSafeContext, GetStylesApi } from '../../core';
import type { StepperFactory } from './Stepper.tsrx';
import type { StepperStepProps } from './StepperStep/StepperStep.tsrx';

export interface ResolvedStepperStep {
  step: number;
  state: NonNullable<StepperStepProps['state']>;
  allowStepClick: boolean;
  onClick?: () => void;
  icon?: StepperStepProps['icon'];
  completedIcon?: StepperStepProps['completedIcon'];
  progressIcon?: StepperStepProps['progressIcon'];
  color?: StepperStepProps['color'];
  iconSize?: StepperStepProps['iconSize'];
}

export interface StepperContextValue {
  getStyles: GetStylesApi<StepperFactory>;
  orientation: 'horizontal' | 'vertical' | undefined;
  iconPosition: 'left' | 'right' | undefined;
  contentTarget: HTMLElement | null;
  keepMounted: boolean;
  resolveStep(props: StepperStepProps): ResolvedStepperStep;
  isCompleted(): boolean;
}

export const [StepperProvider, useStepperContext] = createSafeContext<StepperContextValue>(
  'Stepper component was not found in tree'
);
