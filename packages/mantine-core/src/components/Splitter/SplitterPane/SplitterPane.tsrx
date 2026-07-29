import type { OctaneNode } from 'octane';
import { useEffect } from 'octane';
import type { SplitterPaneSize } from '@octanejs/mantine-hooks';
import {
  Box,
  BoxProps,
  CompoundStylesApiProps,
  ElementProps,
  factory,
  Factory,
  useProps,
} from '../../../core';
import { useSplitterContext } from '../Splitter.context';
import classes from '../Splitter.module.css';

export type SplitterPaneStylesNames = 'pane';

export interface SplitterPaneProps
  extends BoxProps, CompoundStylesApiProps<SplitterPaneFactory>, ElementProps<'div'> {
  /** Initial size, a `number`/`%` is a flexible size (shares leftover space), `px`/`rem` is a fixed size. A bare number is treated as a percentage. */
  defaultSize: SplitterPaneSize;

  /** Minimum size in the same units as `defaultSize` @default 0 */
  min?: SplitterPaneSize;

  /** Maximum size in the same units as `defaultSize`, no limit by default */
  max?: SplitterPaneSize;

  /** Whether this pane can be collapsed @default false */
  collapsible?: boolean;

  /** Size below which the pane snaps to collapsed, defaults to `min` */
  collapseThreshold?: SplitterPaneSize;

  /** Pane content */
  children?: OctaneNode;

  /** @internal Index set by parent */
  __index?: number;
}

export type SplitterPaneFactory = Factory<{
  props: SplitterPaneProps;
  ref: HTMLDivElement;
  stylesNames: SplitterPaneStylesNames;
  compound: true;
}>;

export const SplitterPane = factory<SplitterPaneFactory>((_props) => {
  const props = useProps('SplitterPane', null, _props);
  const {
    className,
    classNames,
    style,
    styles,
    vars,
    children,
    defaultSize,
    min,
    max,
    collapsible,
    collapseThreshold,
    __index,
    mod,
    ...others
  } = props;

  const ctx = useSplitterContext();
  const index = __index ?? ctx.getNextPaneIndex();
  ctx.registerPane(index, { defaultSize, min, max, collapsible, collapseThreshold });
  useEffect(() => ctx.syncPanes(), [defaultSize, min, max, collapsible, collapseThreshold]);
  const isCollapsed = ctx.collapsed[index];

  const sizeStyle = ctx.sizes[index] == null
    ? { flexBasis: typeof defaultSize === 'number' ? `${defaultSize}%` : defaultSize }
    : ctx.getPaneStyle(index);

  return (
    <>
      {ctx.renderHandle(index)}
      <Box
        {...ctx.getStyles('pane', {
          className,
          classNames,
          style: [sizeStyle, style],
          styles,
          props,
        })}
        mod={[{ collapsed: isCollapsed || undefined }, mod]}
        {...others}
      >
        {children}
      </Box>
    </>
  );
});

SplitterPane.classes = classes;
SplitterPane.displayName = '@mantine/core/SplitterPane';
