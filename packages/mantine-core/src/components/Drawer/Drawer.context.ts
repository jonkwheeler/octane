import { createSafeContext, GetStylesApi, MantineRadius } from '../../core';
import type { DrawerRootFactory } from './DrawerRoot.tsrx';

export type ScrollAreaComponent = OctaneComponent<any>;

export interface DrawerContextValue {
  scrollAreaComponent: ScrollAreaComponent | undefined;
  getStyles: GetStylesApi<DrawerRootFactory>;
  radius: MantineRadius | undefined;
}

export const [DrawerProvider, useDrawerContext] = createSafeContext<DrawerContextValue>(
  'Drawer component was not found in tree'
);
