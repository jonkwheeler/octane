import type {
  SplitterPaneSize,
  UseSplitterPanel,
} from '@octanejs/mantine-hooks';
import type { OctaneNode } from 'octane';
import { createSafeContext, GetStylesApi } from '../../core';
import type { SplitterFactory } from './Splitter.tsrx';

export interface SplitterContextValue {
  getStyles: GetStylesApi<SplitterFactory>;
  sizes: SplitterPaneSize[];
  collapsed: boolean[];
  orientation: 'horizontal' | 'vertical';
  getPaneStyle: (index: number) => React.CSSProperties;
  registerPane: (index: number, panel: UseSplitterPanel) => void;
  getNextPaneIndex: () => number;
  syncPanes: () => void;
  renderHandle: (paneIndex: number) => OctaneNode;
}

export const [SplitterProvider, useSplitterContext] = createSafeContext<SplitterContextValue>(
  'Splitter component was not found in the tree'
);
