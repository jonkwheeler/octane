import type { OctaneNode } from 'octane';
import { useLayoutEffect, useRef } from 'octane';
import { useMergedRef } from '@octanejs/mantine-hooks';
import {
  Box,
  BoxProps,
  createVarsResolver,
  ElementProps,
  factory,
  Factory,
  getAutoContrastValue,
  getContrastColor,
  getRadius,
  getThemeColor,
  MantineColor,
  MantineRadius,
  rem,
  StylesApiProps,
  useProps,
  useStyles,
} from '../../core';
import { TimelineProvider } from './Timeline.context';
import {
  TimelineItem,
  TimelineItemStylesNames,
  type TimelineItemProps,
  type TimelineItemFactory,
} from './TimelineItem/TimelineItem.tsrx';
import classes from './Timeline.module.css';
export type TimelineStylesNames = 'root' | TimelineItemStylesNames;
export type TimelineCssVariables = {
  root: '--tl-line-width' | '--tl-bullet-size' | '--tl-color' | '--tl-icon-color' | '--tl-radius';
};

export interface TimelineProps
  extends BoxProps, StylesApiProps<TimelineFactory>, ElementProps<'div'> {
  /** `Timeline.Item` components */
  children?: OctaneNode;

  /** Index of the active element */
  active?: number;

  /** Key of `theme.colors` or any valid CSS color to control active item colors @default theme.primaryColor */
  color?: MantineColor;

  /** Key of `theme.radius` or any valid CSS value to set `border-radius`, numbers are converted to rem @default 'xl' */
  radius?: MantineRadius;

  /** Size of the bullet @default 20 */
  bulletSize?: number | string;

  /** Position of content relative to the bullet @default 'left' */
  align?: 'right' | 'left';

  /** Control width of the line */
  lineWidth?: number | string;

  /** If set, the active items direction is reversed without reversing items order @default false */
  reverseActive?: boolean;

  /** If set, adjusts text color based on background color for `filled` variant */
  autoContrast?: boolean;
}

export type TimelineFactory = Factory<{
  props: TimelineProps;
  ref: HTMLDivElement;
  stylesNames: TimelineStylesNames;
  vars: TimelineCssVariables;
  staticComponents: {
    Item: typeof TimelineItem;
  };
}>;

const defaultProps = {
  active: -1,
  align: 'left',
} satisfies Partial<TimelineProps>;

const varsResolver = createVarsResolver<TimelineFactory>(
  (theme, { bulletSize, lineWidth, radius, color, autoContrast }) => ({
    root: {
      '--tl-bullet-size': rem(bulletSize),
      '--tl-line-width': rem(lineWidth),
      '--tl-radius': radius === undefined ? undefined : getRadius(radius),
      '--tl-color': color ? getThemeColor(color, theme) : undefined,
      '--tl-icon-color': getAutoContrastValue(autoContrast, theme)
        ? getContrastColor({ color, theme, autoContrast })
        : undefined,
    },
  })
);

export const Timeline = factory<TimelineFactory>((_props) => {
  const props = useProps('Timeline', defaultProps, _props);
  const {
    classNames,
    className,
    style,
    styles,
    unstyled,
    vars,
    children,
    active,
    color,
    radius,
    bulletSize,
    align,
    lineWidth,
    reverseActive,
    mod,
    autoContrast,
    attributes,
    ref,
    ...others
  } = props;

  const getStyles = useStyles<TimelineFactory>({
    name: 'Timeline',
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

  let nextItem = 0;
  const resolveItem = (itemProps: TimelineItemProps) => {
    const index = nextItem++;
    return {
      align: align || 'left',
      active: Boolean(itemProps.__active) || (!reverseActive && (active ?? -1) >= index),
      lineActive:
        Boolean(itemProps.__lineActive) || (!reverseActive && (active ?? -1) - 1 >= index),
    };
  };
  const rootRef = useRef<HTMLDivElement | null>(null);
  const mergedRef = useMergedRef(ref, rootRef);
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const items = Array.from(root.querySelectorAll<HTMLElement>(':scope > [data-timeline-item]'));
    root.toggleAttribute(
      'data-opposite',
      items.some((item) => item.hasAttribute('data-has-opposite')),
    );
    if (reverseActive) {
      items.forEach((item, index) => {
        const itemActive = (active ?? -1) >= items.length - index - 1;
        item.toggleAttribute('data-active', itemActive);
        item.toggleAttribute('data-line-active', itemActive);
        item
          .querySelector<HTMLElement>('[data-timeline-bullet]')
          ?.toggleAttribute('data-active', itemActive);
      });
    }
  }, [children, active, reverseActive]);

  return (
    <TimelineProvider value={{ getStyles, resolveItem }}>
      <Box {...getStyles('root')} mod={[{ align }, mod]} {...others} ref={mergedRef}>
        {children}
      </Box>
    </TimelineProvider>
  );
});

Timeline.classes = classes;
Timeline.varsResolver = varsResolver;
Timeline.displayName = '@mantine/core/Timeline';
Timeline.Item = TimelineItem;

export declare namespace Timeline {
  export type Props = TimelineProps;
  export type StylesNames = TimelineStylesNames;
  export type CssVariables = TimelineCssVariables;
  export type Factory = TimelineFactory;

  export namespace Item {
    export type Props = TimelineItemProps;
    export type StylesNames = TimelineItemStylesNames;
    export type Factory = TimelineItemFactory;
  }
}
