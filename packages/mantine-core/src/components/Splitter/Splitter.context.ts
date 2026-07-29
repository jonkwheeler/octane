import type { SplitterPaneSize } from '@octanejs/mantine-hooks';
import { createSafeContext, GetStylesApi } from '../../core';
import type { SplitterFactory } from './Splitter.tsrx';

export interface SplitterContextValue {
  getStyles: GetStylesApi<SplitterFactory>;
  sizes: SplitterPaneSize[];
  collapsed: boolean[];
  orientation: 'horizontal' | 'vertical';
  getPaneStyle: (index: number) => React.CSSProperties;
}

export const [SplitterProvider, useSplitterContext] = createSafeContext<SplitterContextValue>(
  'Splitter component was not found in the tree'
);
