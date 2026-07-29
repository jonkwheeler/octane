import type { Octane } from 'octane/jsx-runtime';
import type { OctaneNode } from 'octane';
import type { Ref } from 'react';
import { useScroller } from '@octanejs/mantine-hooks';
import {
  Box,
  BoxProps,
  createVarsResolver,
  ElementProps,
  factory,
  Factory,
  getThemeColor,
  rem,
  StylesApiProps,
  useProps,
  useStyles,
} from '../../core';
import { AccordionChevron } from '../Accordion';
import { UnstyledButton } from '../UnstyledButton';
import classes from './Scroller.module.css';

export type ScrollerStylesNames = 'root' | 'container' | 'content' | 'control' | 'chevron';
export type ScrollerCssVariables = {
  root: '--scroller-control-size' | '--scroller-background-color';
};

export interface ScrollerProps extends BoxProps, StylesApiProps<ScrollerFactory>, ElementProps<
  'div'
> {
  /** Content to display */
  children: OctaneNode;
  /** Amount of pixels to scroll when clicking the control buttons, `200` by default */
  scrollAmount?: number;
  /** Size of the control buttons, @default 60px */
  controlSize?: string | number;
  /** Background color for the gradient fade on controls, `'var(--mantine-color-body)'` by default */
  edgeGradientColor?: string;
  /** Props passed to the start control button */
  startControlProps?: MantineIntrinsicProps<'button'>;
  /** Props passed to the end control button */
  endControlProps?: MantineIntrinsicProps<'button'>;
  /** Icon component for the start control, AccordionChevron by default */
  startControlIcon?: OctaneNode;
  /** Icon component for the end control, AccordionChevron by default */
  endControlIcon?: OctaneNode;
  /** Determines whether start control should always be visible regardless of scroll position, `false` by default */
  showStartControl?: boolean;
  /** Determines whether end control should always be visible regardless of scroll position, `false` by default */
  showEndControl?: boolean;
  /** Determines whether content can be scrolled by dragging with mouse, `true` by default */
  draggable?: boolean;
  /** Ref for the scroll container element */
  ref?: Ref<HTMLDivElement>;
}

export type ScrollerFactory =
  Factory<{
    props: ScrollerProps;
    ref: HTMLDivElement;
    stylesNames: ScrollerStylesNames;
    vars: ScrollerCssVariables;
  }>;

const defaultProps: Partial<ScrollerProps> = {
  scrollAmount: 200,
  draggable: true,
};

const varsResolver = createVarsResolver<ScrollerFactory>(
  (theme, { controlSize, edgeGradientColor }) => ({
    root: {
      '--scroller-control-size': rem(controlSize),
      '--scroller-background-color': edgeGradientColor
        ? getThemeColor(edgeGradientColor, theme)
        : undefined,
    },
  }),
);

export const Scroller = factory<ScrollerFactory>((_props) => {
  const props = useProps('Scroller', defaultProps, _props);
  const {
    classNames,
    className,
    style,
    styles,
    unstyled,
    vars,
    children,
    scrollAmount,
    controlSize,
    edgeGradientColor,
    startControlProps,
    endControlProps,
    startControlIcon,
    endControlIcon,
    showStartControl,
    showEndControl,
    draggable,
    mod,
    ref,
    attributes,
    ...others
  } = props;

  const getStyles = useStyles<ScrollerFactory>({
    name: 'Scroller',
    classes,
    props,
    className,
    style,
    classNames,
    styles,
    unstyled,
    vars,
    varsResolver,
    attributes,
  });

  const scroller = useScroller({
    scrollAmount,
    draggable,
  });

  const showStart = showStartControl || scroller.canScrollStart;
  const showEnd = showEndControl || scroller.canScrollEnd;
  const rootProps = Object.assign({}, getStyles('root'), others);
  const startProps = Object.assign({}, getStyles('control'), startControlProps);
  const endProps = Object.assign({}, getStyles('control'), endControlProps);
  const containerProps = Object.assign({}, getStyles('container'), scroller.dragHandlers);
  const contentStyles = getStyles('content');
  const startIcon = startControlIcon || <AccordionChevron {...getStyles('chevron')} />;
  const endIcon = endControlIcon || <AccordionChevron {...getStyles('chevron')} />;
  const startButtonProps = Object.assign({}, startProps, {
    onClick: scroller.scrollStart,
    'data-position': 'start',
    'data-hidden': !showStart || undefined,
    'aria-label': 'Scroll left',
    tabIndex: showStart ? 0 : -1,
  });
  const endButtonProps = Object.assign({}, endProps, {
    onClick: scroller.scrollEnd,
    'data-position': 'end',
    'data-hidden': !showEnd || undefined,
    'aria-label': 'Scroll right',
    tabIndex: showEnd ? 0 : -1,
  });
  const scrollContainerProps: any = Object.assign({}, containerProps, {
    ref: scroller.ref,
    role: 'presentation',
    'data-draggable': draggable || undefined,
  });

  return <Box {...rootProps} ref={ref} mod={mod}>
    <UnstyledButton {...startButtonProps}>{startIcon}</UnstyledButton>

    <div {...scrollContainerProps}>
      <div {...contentStyles}>{children}</div>
    </div>

    <UnstyledButton {...endButtonProps}>{endIcon}</UnstyledButton>
  </Box>;
});

Scroller.classes = classes;
Scroller.varsResolver = varsResolver;
Scroller.displayName = '@mantine/core/Scroller';

export declare namespace Scroller {
  export type Props = ScrollerProps;
  export type StylesNames = ScrollerStylesNames;
  export type CssVariables = ScrollerCssVariables;
  export type Factory = ScrollerFactory;
}
