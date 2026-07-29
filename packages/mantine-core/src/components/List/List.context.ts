import type { OctaneNode } from 'octane';
import { createSafeContext, GetStylesApi } from '../../core';
import type { ListFactory } from './List.tsrx';

export interface ListContextValue {
  getStyles: GetStylesApi<ListFactory>;
  center: boolean | undefined;
  icon: OctaneNode | undefined;
}

export const [ListProvider, useListContext] = createSafeContext<ListContextValue>(
  'List component was not found in tree'
);
