import type { OctaneNode } from 'octane';
import { Fragment } from 'octane';
import {
  BoxProps,
  CompoundStylesApiProps,
  ElementProps,
  factory,
  Factory,
  getThemeColor,
  MantineColor,
  useMantineTheme,
  useProps,
} from '../../../core';
import { CheckIcon } from '../../Checkbox';
import { Loader } from '../../Loader';
import { Portal } from '../../Portal';
import { Transition } from '../../Transition';
import { UnstyledButton } from '../../UnstyledButton';
import type { StepFragmentComponent } from '../Stepper.tsrx';
import { useStepperContext } from '../Stepper.context';
import classes from '../Stepper.module.css';

const getStepFragment = (
  Fragment: StepFragmentComponent | OctaneNode,
  step: number | undefined
) => {
  if (typeof Fragment === 'function') {
    return <Fragment step={step || 0} />;
  }

  return Fragment;
};

export type StepperStepStylesNames =
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

export interface StepperStepProps
  extends BoxProps, CompoundStylesApiProps<StepperStepFactory>, ElementProps<'button'> {
  /** 0-based step index, automatically set by Stepper component */
  step?: number;

  /** Step state, automatically set by Stepper component based on active prop. stepInactive: not reached, stepProgress: current, stepCompleted: passed */
  state?: 'stepInactive' | 'stepProgress' | 'stepCompleted';

  /** Key of `theme.colors`, by default controlled by Stepper component */
  color?: MantineColor;

  /** When false, hides the step icon. Useful for creating compact steppers with only labels @default true */
  withIcon?: boolean;

  /** Step icon, defaults to `step index + 1` when rendered within Stepper */
  icon?: OctaneNode | StepFragmentComponent;

  /** Step icon displayed when step is completed */
  completedIcon?: OctaneNode | StepFragmentComponent;

  /** Step icon displayed when step is in progress */
  progressIcon?: OctaneNode | StepFragmentComponent;

  /** Step label, render after icon */
  label?: OctaneNode | StepFragmentComponent;

  /** Step description */
  description?: OctaneNode | StepFragmentComponent;

  /** Icon wrapper size */
  iconSize?: string | number;

  /** Icon position relative to step body, controlled by Stepper component */
  iconPosition?: 'right' | 'left';

  /** Indicates loading state of the step */
  loading?: boolean;

  /** Set to false to disable clicks on step */
  allowStepClick?: boolean;

  /** Should step selection be allowed */
  allowStepSelect?: boolean;

  /** Static selector base */
  __staticSelector?: string;

  /** Component orientation */
  orientation?: 'vertical' | 'horizontal';
}

export type StepperStepFactory = Factory<{
  props: StepperStepProps;
  ref: HTMLButtonElement;
  stylesNames: StepperStepStylesNames;
  compound: true;
}>;

const defaultProps = {
  withIcon: true,
  allowStepClick: true,
  iconPosition: 'left',
} satisfies Partial<StepperStepProps>;

export const StepperStep = factory<StepperStepFactory>((props) => {
  const {
    classNames,
    className,
    style,
    styles,
    vars,
    step,
    state,
    color,
    icon,
    completedIcon,
    progressIcon,
    label,
    description,
    withIcon,
    iconSize,
    loading,
    allowStepClick,
    allowStepSelect,
    iconPosition,
    orientation,
    mod,
    children,
    ...others
  } = useProps('StepperStep', defaultProps, props);

  const ctx = useStepperContext();
  const resolved = ctx.resolveStep(props);
  const resolvedStep = step ?? resolved.step;
  const resolvedState = state ?? resolved.state;
  const resolvedColor = color ?? resolved.color;
  const resolvedIcon = icon ?? resolved.icon;
  const resolvedCompletedIcon = completedIcon ?? resolved.completedIcon;
  const resolvedProgressIcon = progressIcon ?? resolved.progressIcon;
  const resolvedIconSize = iconSize ?? resolved.iconSize;
  const resolvedAllowStepClick = allowStepClick && resolved.allowStepClick;
  const theme = useMantineTheme();
  const stylesApi = { classNames, styles };

  const _icon =
    resolvedState === 'stepCompleted'
      ? null
      : resolvedState === 'stepProgress'
        ? resolvedProgressIcon
        : resolvedIcon;
  const dataAttributes = {
    'data-progress': resolvedState === 'stepProgress' || undefined,
    'data-completed': resolvedState === 'stepCompleted' || undefined,
  };

  return (
    <Fragment>
      <UnstyledButton
      {...ctx.getStyles('step', { className, style, variant: ctx.orientation, ...stylesApi })}
      mod={[
        {
          'icon-position': iconPosition || ctx.iconPosition,
          'allow-click': resolvedAllowStepClick,
        },
        mod,
      ]}
      {...dataAttributes}
      {...others}
      __vars={{
        '--step-color': resolvedColor ? getThemeColor(resolvedColor, theme) : undefined,
      }}
      tabIndex={resolvedAllowStepClick ? 0 : -1}
      onClick={resolved.onClick}
    >
      {withIcon && (
        <span {...ctx.getStyles('stepWrapper', stylesApi)}>
          <span {...ctx.getStyles('stepIcon', stylesApi)} {...dataAttributes}>
            <Transition mounted={resolvedState === 'stepCompleted'} transition="pop" duration={200}>
              {(transitionStyles) => (
                <span
                  {...ctx.getStyles('stepCompletedIcon', { style: transitionStyles, ...stylesApi })}
                >
                  {loading ? (
                    <Loader
                      color="var(--mantine-color-white)"
                      size="calc(var(--stepper-icon-size) / 2)"
                      {...ctx.getStyles('stepLoader', stylesApi)}
                    />
                  ) : (
                    getStepFragment(resolvedCompletedIcon, resolvedStep) || <CheckIcon size="60%" />
                  )}
                </span>
              )}
            </Transition>

            {resolvedState !== 'stepCompleted' ? (
              <span {...ctx.getStyles('stepIconContent', stylesApi)}>
                {loading ? (
                  <Loader
                    {...ctx.getStyles('stepLoader', stylesApi)}
                    size="calc(var(--stepper-icon-size) / 2)"
                    color={resolvedColor}
                  />
                ) : (
                  getStepFragment(_icon || resolvedIcon, resolvedStep)
                )}
              </span>
            ) : null}
          </span>
          {orientation === 'vertical' && (
            <span
              {...ctx.getStyles('verticalSeparator', stylesApi)}
              data-active={resolvedState === 'stepCompleted' || undefined}
            />
          )}
        </span>
      )}

      {(label || description) && (
        <span
          {...ctx.getStyles('stepBody', stylesApi)}
          data-orientation={ctx.orientation}
          data-icon-position={iconPosition || ctx.iconPosition}
        >
          {label && (
            <span {...ctx.getStyles('stepLabel', stylesApi)}>
              {getStepFragment(label, resolvedStep)}
            </span>
          )}
          {description && (
            <span {...ctx.getStyles('stepDescription', stylesApi)}>
              {getStepFragment(description, resolvedStep)}
            </span>
          )}
        </span>
      )}
      </UnstyledButton>
      {ctx.orientation === 'horizontal' && (
        <div
          {...ctx.getStyles('separator')}
          data-active={resolvedState === 'stepCompleted' || undefined}
          data-orientation={ctx.orientation}
        />
      )}
      {!ctx.contentTarget && children && resolvedState === 'stepProgress' && (
        <div {...ctx.getStyles('content')}>{children}</div>
      )}
      {ctx.contentTarget && children && (ctx.keepMounted || resolvedState === 'stepProgress') && (
        <Portal target={ctx.contentTarget}>
          <div
            {...ctx.getStyles('content')}
            style={ctx.keepMounted && resolvedState !== 'stepProgress' ? { display: 'none' } : undefined}
          >
            {children}
          </div>
        </Portal>
      )}
    </Fragment>
  );
});

StepperStep.classes = classes;
StepperStep.displayName = '@mantine/core/StepperStep';
