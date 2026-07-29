import { useMergedRef } from '@octanejs/mantine-hooks';
import {
  Box,
  createVarsResolver,
  factory,
  Factory,
  getDefaultZIndex,
  getRadius,
  getStyleObject,
  getThemeColor,
  useMantineTheme,
  useProps,
  useStyles,
} from '../../../core';
import { OptionalPortal } from '../../Portal';
import { TooltipBaseProps, TooltipCssVariables, TooltipStylesNames } from '../Tooltip.types';
import { useFloatingTooltip } from './use-floating-tooltip';
import classes from '../Tooltip.module.css';

export interface TooltipFloatingProps extends TooltipBaseProps {
  /** Offset from mouse in px @default 10 */
  offset?: number;

  /** Uncontrolled tooltip initial opened state */
  defaultOpened?: boolean;
}

export type TooltipFloatingFactory = Factory<{
  props: TooltipFloatingProps;
  ref: HTMLDivElement;
  stylesNames: TooltipStylesNames;
  vars: TooltipCssVariables;
}>;

const defaultProps = {
  refProp: 'ref',
  withinPortal: true,
  offset: 10,
  position: 'right',
  zIndex: getDefaultZIndex('popover'),
} satisfies Partial<TooltipFloatingProps>;

const varsResolver = createVarsResolver<TooltipFloatingFactory>((theme, { radius, color }) => ({
  tooltip: {
    '--tooltip-radius': radius === undefined ? undefined : getRadius(radius),
    '--tooltip-bg': color ? getThemeColor(color, theme) : undefined,
    '--tooltip-color': color ? 'var(--mantine-color-white)' : undefined,
  },
}));

export const TooltipFloating = factory<TooltipFloatingFactory>((_props) => {
  const props = useProps('TooltipFloating', defaultProps, _props);
  const {
    children,
    refProp,
    withinPortal,
    style,
    className,
    classNames,
    styles,
    unstyled,
    radius,
    color,
    label,
    offset,
    position,
    multiline,
    zIndex,
    disabled,
    defaultOpened,
    variant,
    vars,
    portalProps,
    attributes,
    ref,
    ...others
  } = props;

  const theme = useMantineTheme();
  const getStyles = useStyles<TooltipFloatingFactory>({
    name: 'TooltipFloating',
    props,
    classes,
    className,
    style,
    classNames,
    styles,
    unstyled,
    attributes,
    rootSelector: 'tooltip',
    vars,
    varsResolver,
  });

  const { handleMouseMove, x, y, opened, boundaryRef, floating, setOpened } = useFloatingTooltip({
    offset,
    position,
    defaultOpened,
  });

  const targetRef = useMergedRef(boundaryRef, ref);

  const onMouseEnter = (event: OctaneMouseEvent<unknown, MouseEvent>) => {
    handleMouseMove(event);
    setOpened(true);
  };

  const onMouseLeave = (event: OctaneMouseEvent<unknown, MouseEvent>) => {
    setOpened(false);
  };

  return (
    <>
      <OptionalPortal {...portalProps} withinPortal={withinPortal}>
        <Box
          {...others}
          {...getStyles('tooltip', {
            style: {
              ...getStyleObject(style, theme),
              zIndex: zIndex as React.CSSProperties['zIndex'],
              display: !disabled && opened ? 'block' : 'none',
              top: (y && Math.round(y)) ?? '',
              left: (x && Math.round(x)) ?? '',
            },
          })}
          variant={variant}
          ref={floating}
          mod={{ multiline }}
        >
          {label}
        </Box>
      </OptionalPortal>

      <span
        ref={targetRef}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        style={{ display: 'inline-flex' }}
      >
        {children}
      </span>
    </>
  );
});

TooltipFloating.classes = classes;
TooltipFloating.varsResolver = varsResolver;
TooltipFloating.displayName = '@mantine/core/TooltipFloating';
