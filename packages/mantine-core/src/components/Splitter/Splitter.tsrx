import type { OctaneNode } from 'octane';
import { useImperativeHandle, useRef, useState } from 'octane';
import {
  SplitterPaneSize,
  SplitterStep,
  useMergedRef,
  useSplitter,
  UseSplitterRedistributeFn,
  UseSplitterReturnValue,
  UseSplitterPanel,
} from '@octanejs/mantine-hooks';
import {
  Box,
  BoxProps,
  createVarsResolver,
  ElementProps,
  factory,
  Factory,
  getThemeColor,
  MantineColor,
  rem,
  StylesApiProps,
  useDirection,
  useProps,
  useStyles,
} from '../../core';
import { GripHorizontalIcon, GripVerticalIcon } from './GripIcon.tsrx';
import { SplitterProvider } from './Splitter.context';
import {
  SplitterPane,
  SplitterPaneProps,
  SplitterPaneStylesNames,
} from './SplitterPane/SplitterPane.tsrx';
import classes from './Splitter.module.css';

const PX_RE = /^(-?[\d.]+)px$/;
const REM_RE = /^(-?[\d.]+)rem$/;

function isFixedPaneSize(size: SplitterPaneSize): boolean {
  return typeof size === 'string' && (PX_RE.test(size) || REM_RE.test(size));
}

function getPaneFlexStyle(size: SplitterPaneSize, pixelMode: boolean): React.CSSProperties {
  const magnitude =
    typeof size === 'number' ? size : parseFloat(size);

  if (!pixelMode) {
    return { flexBasis: `${magnitude}%` };
  }

  if (isFixedPaneSize(size)) {
    return { flexGrow: 0, flexShrink: 1, flexBasis: size as string };
  }

  return { flexGrow: magnitude, flexShrink: 1, flexBasis: 0 };
}

export type SplitterStylesNames = 'root' | 'handle' | 'thumb' | SplitterPaneStylesNames;

export type SplitterCssVariables = {
  root: '--splitter-line-size' | '--splitter-handle-color';
};

export interface SplitterProps extends BoxProps, StylesApiProps<SplitterFactory>, ElementProps<
  'div'
> {
  /** Layout direction @default 'horizontal' */
  orientation?: 'horizontal' | 'vertical';
  /** Controlled sizes, each value keeps the unit it was declared in (number/`%` flexible, `px`/`rem` fixed) */
  sizes?: SplitterPaneSize[];
  /** Called during resize with updated sizes, each value keeps its declared unit */
  onSizeChange?: (sizes: SplitterPaneSize[]) => void;
  /** Called when drag starts */
  onResizeStart?: (handleIndex: number) => void;
  /** Called when drag ends */
  onResizeEnd?: (handleIndex: number, sizes: SplitterPaneSize[]) => void;
  /** Called when a panel collapses or expands */
  onCollapseChange?: (panelIndex: number, collapsed: boolean) => void;
  /** How to redistribute space when immediate neighbor is at its min/max */
  redistribute?: 'nearest' | 'equal' | UseSplitterRedistributeFn;
  /** Keyboard step size, a `number`/`%` is a percentage, `px`/`rem` is resolved to pixels @default 1 */
  step?: SplitterStep;
  /** Shift+arrow step size, a `number`/`%` is a percentage, `px`/`rem` is resolved to pixels @default 10 */
  shiftStep?: SplitterStep;
  /** CSS value for separator line thickness between panes @default 2 */
  lineSize?: number | string;
  /** Key of `theme.colors` or any valid CSS color for the separator line */
  handleColor?: MantineColor;
  /** Custom icon displayed in the handle thumb, by default uses grip icon based on orientation */
  handleIcon?: OctaneNode;
  /** Determines whether the thumb with grip icon is displayed on the handle @default true */
  withHandle?: boolean;
  /** Restore the two panes adjacent to a handle to their default ratio (preserving their combined size) when the handle is double-clicked @default true */
  resetOnDoubleClick?: boolean;
  /** Ref to imperative splitter API (sizes, collapse, expand, etc.) */
  splitterRef?: React.RefObject<UseSplitterReturnValue | null>;
  /** Splitter panes */
  children?: OctaneNode;
}

export type SplitterFactory =
  Factory<{
    props: SplitterProps;
    ref: HTMLDivElement;
    stylesNames: SplitterStylesNames;
    vars: SplitterCssVariables;
    staticComponents: {
      Pane: typeof SplitterPane;
    };
  }>;

const defaultProps = {
  orientation: 'horizontal',
  lineSize: 2,
  withHandle: true,
  resetOnDoubleClick: true,
} satisfies Partial<SplitterProps>;

const varsResolver = createVarsResolver<SplitterFactory>(
  (theme, { lineSize, handleColor }) => ({
    root: {
      '--splitter-line-size': rem(lineSize),
      '--splitter-handle-color': handleColor ? getThemeColor(handleColor, theme) : undefined,
    },
  }),
);

export const Splitter = factory<SplitterFactory>((_props) => {
  const props = useProps('Splitter', defaultProps, _props);
  const {
    orientation,
    sizes: controlledSizes,
    onSizeChange,
    onResizeStart,
    onResizeEnd,
    onCollapseChange,
    redistribute,
    step,
    shiftStep,
    lineSize,
    handleColor,
    handleIcon,
    withHandle,
    resetOnDoubleClick,
    splitterRef,
    children,
    className,
    classNames,
    style,
    styles,
    unstyled,
    vars,
    mod,
    attributes,
    ref,
    ...others
  } = props;

  const { dir } = useDirection();

  const registeredPanels = useRef<UseSplitterPanel[]>([]);
  const paneIndex = useRef(0);
  const [panelsRevision, setPanelsRevision] = useState(0);
  const [runtimeSizes, setRuntimeSizes] = useState<SplitterPaneSize[]>([]);
  const panels = registeredPanels.current.slice();
  const defaultSizes = panels.map((panel) => panel.defaultSize);
  const effectiveSizes =
    controlledSizes ??
    (runtimeSizes.length === panels.length ? runtimeSizes : defaultSizes);

  const splitter = useSplitter({
    panels,
    orientation,
    sizes: effectiveSizes,
    onSizeChange: (nextSizes) => {
      setRuntimeSizes(nextSizes);
      onSizeChange?.(nextSizes);
    },
    onResizeStart,
    onResizeEnd,
    onCollapseChange,
    redistribute,
    step,
    shiftStep,
    dir,
    resetOnDoubleClick,
  });

  useImperativeHandle(splitterRef, () => splitter, [splitter]);

  const getPaneStyle = (index: number) => getPaneFlexStyle(
    splitter.sizes[index],
    splitter.pixelMode,
  );

  const mergedRef = useMergedRef(ref, splitter.ref);

  const getStyles = useStyles<SplitterFactory>({
    name: 'Splitter',
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

  const defaultIcon =
    orientation === 'vertical' ? <GripHorizontalIcon /> : <GripVerticalIcon />;
  const thumbIcon =
    handleIcon !== undefined ? handleIcon : defaultIcon;
  const SplitterBox = Box as any;

  paneIndex.current = 0;
  const registerPane = (index: number, panel: UseSplitterPanel) => {
    registeredPanels.current[index] = panel;
  };
  const syncPanes = () => setPanelsRevision((value) => value + 1);
  const renderHandle = (index: number) => {
    if (index <= 0 || splitter.sizes.length <= index) {
      return null;
    }
    const handleIndex = index - 1;
    const handleProps = splitter.getHandleProps({ index: handleIndex });
    const isActive = splitter.activeHandle === handleIndex;
    return (
      <SplitterBox {...getStyles('handle')} {...handleProps}>
        {withHandle &&
          <div
            {...getStyles('thumb')}
            data-orientation={orientation}
            data-active={isActive || undefined}
          >{thumbIcon}</div>}
      </SplitterBox>
    );
  };

  return <SplitterProvider
    value={{
      getStyles,
      sizes: splitter.sizes,
      collapsed: splitter.collapsed,
      orientation: orientation!,
      getPaneStyle,
      registerPane,
      getNextPaneIndex: () => paneIndex.current++,
      syncPanes,
      renderHandle,
    }}
  >
    <Box
      ref={mergedRef}
      {...getStyles('root')}
      mod={[{ orientation }, mod]}
      {...others}
    >{children}</Box>
  </SplitterProvider>;
});

Splitter.classes = classes;
Splitter.varsResolver = varsResolver;
Splitter.displayName = '@mantine/core/Splitter';
Splitter.Pane = SplitterPane;
