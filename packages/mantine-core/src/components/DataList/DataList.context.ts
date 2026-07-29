import { createSafeContext, GetStylesApi } from '../../core';
import type { DataListFactory } from './DataList.tsrx';

export interface DataListContextValue {
  getStyles: GetStylesApi<DataListFactory>;
}

export const [DataListProvider, useDataListContext] = createSafeContext<DataListContextValue>(
  'DataList component was not found in tree'
);
