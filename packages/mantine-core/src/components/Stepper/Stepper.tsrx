import type { OctaneNode } from 'octane';
import { useCallback, useId, useState } from 'octane';
import {
  Box,
  BoxProps,
  createVarsResolver,
  ElementProps,
  factory,
  Factory,
  getAutoContrastValue,
  getContrastColor,
  getFontSize,
  getRadius,
  getSize,
  getSpacing,
  getThemeColor,
  MantineColor,
  MantineRadius,
  MantineSize,
  MantineSpacing,
  rem,
  StylesApiProps,
  useProps,
  useStyles,
} from '../../core';
import { StepperProvider, type StepperContextValue } from './Stepper.context';
import {
  StepperCompleted,
  StepperCompletedProps,
} from './StepperCompleted/StepperCompleted.tsrx';
import { StepperStep, StepperStepProps } from './StepperStep/StepperStep.tsrx';
import classes from './Stepper.module.css';
export type StepFragmentComponent = OctaneComponent<{ step: number }>;

export type StepperStylesNames =
  | 'root'
  | 'separator'
  | 'steps'
  | 'content'
  | 'step'
  | 'stepLoader'
  | 'verticalSeparator'
  | 'stepWrapper'
  | 'stepIcon'
  | 'stepCompletedIcon'
  | 'stepIconContent'
  | 'stepBody'
  | 'stepLabel'
  | 'stepDescription';

export type StepperCssVariables = {
  root:
    | '--stepper-color'
    | '--stepper-icon-color'
    | '--stepper-icon-size'
    | '--stepper-content-padding'
    | '--stepper-radius'
    | '--stepper-fz'
    | '--stepper-spacing';
};

export interface StepperProps
  extends BoxProps, StylesApiProps<StepperFactory>, ElementProps<'div'> {
  /** `Stepper.Step` components */
  children: OctaneNode;

  /** Called when a clickable step is clicked with its 0-based index. Not called for the currently active step. */
  onStepClick?: (stepIndex: number) => void;

  /** Index of the active step */
  active: number;

  /** Step icon @default step index + 1 */
  icon?: OctaneNode | StepFragmentComponent;

  /** Step icon displayed when step is completed @default CheckIcon */
  completedIcon?: OctaneNode | StepFragmentComponent;

  /** Step icon displayed when step is in progress @default step index + 1 */
  progressIcon?: OctaneNode | StepFragmentComponent;

  /** Key of `theme.colors` or any valid CSS color, controls colors of active and progress steps @default theme.primaryColor */
  color?: MantineColor;

  /** Controls size of the step icon, by default icon size is inferred from `size` prop */
  iconSize?: number | string;

  /** Key of `theme.spacing` or any valid CSS value to set `padding-top` of the content @default 'md' */
  contentPadding?: MantineSpacing;

  /** Stepper orientation @default 'horizontal' */
  orientation?: 'vertical' | 'horizontal';

  /** Icon position relative to the step body @default 'left' */
  iconPosition?: 'right' | 'left';

  /** Controls size of various Stepper elements */
  size?: MantineSize;

  /** Key of `theme.radius` or any valid CSS value to set steps border-radius @default "xl" */
  radius?: MantineRadius;

  /** When true, users can click and jump to any step. When false, users can only navigate to completed steps @default true */
  allowNextStepsSelect?: boolean;

  /** Determines whether steps should wrap to the next line if no space is available @default true */
  wrap?: boolean;

  /** When true, automatically adjusts the icon color in completed steps to ensure sufficient contrast against the step background color */
  autoContrast?: boolean;

  /** If set, all step content is kept mounted. React 19 `Activity` is used to preserve state while content is hidden. @default false */
  keepMounted?: boolean;
}

export type StepperFactory = Factory<{
  props: StepperProps;
  ref: HTMLDivElement;
  stylesNames: StepperStylesNames;
  vars: StepperCssVariables;
  staticComponents: {
    Step: typeof StepperStep;
    Completed: typeof StepperCompleted;
  };
}>;

const defaultProps = {
  orientation: 'horizontal',
  iconPosition: 'left',
  allowNextStepsSelect: true,
  wrap: true,
} satisfies Partial<StepperProps>;

const varsResolver = createVarsResolver<StepperFactory>(
  (theme, { color, iconSize, size, contentPadding, radius, autoContrast }) => ({
    root: {
      '--stepper-color': color ? getThemeColor(color, theme) : undefined,
      '--stepper-icon-color': getAutoContrastValue(autoContrast, theme)
        ? getContrastColor({ color, theme, autoContrast })
        : undefined,
      '--stepper-icon-size':
        iconSize === undefined ? getSize(size, 'stepper-icon-size') : rem(iconSize),
      '--stepper-content-padding': getSpacing(contentPadding),
      '--stepper-radius': radius === undefined ? undefined : getRadius(radius),
      '--stepper-fz': getFontSize(size),
      '--stepper-spacing': getSpacing(size),
    },
  })
);

export const Stepper = factory<StepperFactory>((_props) => {
  const props = useProps('Stepper', defaultProps, _props);
  const {
    classNames,
    className,
    style,
    styles,
    unstyled,
    vars,
    children,
    onStepClick,
    active,
    icon,
    completedIcon,
    progressIcon,
    color,
    iconSize,
    contentPadding,
    orientation,
    iconPosition,
    size,
    radius,
    allowNextStepsSelect,
    wrap,
    autoContrast,
    keepMounted,
    attributes,
    ...others
  } = props;

  const getStyles = useStyles<StepperFactory>({
    name: 'Stepper',
    classes,
    props,
    className,
    style,
    classNames,
    styles,
    unstyled,
    attributes,
    vars,
    varsResolver,
  });
  const contentId = useId();
  const [contentTarget, setContentTarget] = useState<HTMLElement | null>(null);
  const contentRef = useCallback((node: HTMLElement | null) => {
    if (node) {
      setContentTarget((current) => (current === node ? current : node));
    }
  }, []);

  let nextStep = 0;
  const resolveStep = (stepProps: StepperStepProps) => {
      const index = nextStep++;
      const state: NonNullable<StepperStepProps['state']> =
        active === index ? 'stepProgress' : active > index ? 'stepCompleted' : 'stepInactive';
      const shouldAllowSelect = () => {
        if (typeof onStepClick !== 'function') {
          return false;
        }
        if (typeof stepProps.allowStepSelect === 'boolean') {
          return stepProps.allowStepSelect;
        }
        return state === 'stepCompleted' || allowNextStepsSelect;
      };
      const isStepSelectionEnabled = shouldAllowSelect();
      return {
        step: index,
        state,
        allowStepClick: isStepSelectionEnabled,
        onClick: isStepSelectionEnabled ? () => onStepClick?.(index) : undefined,
        icon: stepProps.icon || icon || index + 1,
        completedIcon: stepProps.completedIcon || completedIcon,
        progressIcon: stepProps.progressIcon || progressIcon,
        color: stepProps.color || color,
        iconSize,
      };
  };
  const isCompleted = () => active >= nextStep;

  return (
    <StepperProvider
      value={{
        getStyles,
        orientation,
        iconPosition,
        contentTarget,
        keepMounted: Boolean(keepMounted),
        resolveStep,
        isCompleted,
      }}
    >
      <Box {...getStyles('root')} size={size} {...others}>
        <Box
          {...getStyles('steps')}
          mod={{
            orientation,
            'icon-position': iconPosition,
            wrap: wrap && orientation !== 'vertical',
          }}
        >
          {children}
        </Box>
        <div id={contentId} ref={contentRef} />
      </Box>
    </StepperProvider>
  );
});

Stepper.classes = classes;
Stepper.varsResolver = varsResolver;
Stepper.displayName = '@mantine/core/Stepper';
Stepper.Completed = StepperCompleted;
Stepper.Step = StepperStep;

export declare namespace Stepper {
  export type Props = StepperProps;
  export type StylesNames = StepperStylesNames;
  export type CssVariables = StepperCssVariables;
  export type Factory = StepperFactory;
  export type Step = StepFragmentComponent;
  export type ContextValue = StepperContextValue;

  export namespace Step {
    export type Props = StepperStepProps;
  }

  export namespace Completed {
    export type Props = StepperCompletedProps;
  }
}
