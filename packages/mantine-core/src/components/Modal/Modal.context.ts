import { createSafeContext, GetStylesApi } from '../../core';
import type { ModalRootFactory } from './ModalRoot.tsrx';

export type ScrollAreaComponent = OctaneComponent<any>;

export interface ModalContextValue {
  fullScreen: boolean | undefined;
  yOffset: string | number | undefined;
  scrollAreaComponent: ScrollAreaComponent | undefined;
  getStyles: GetStylesApi<ModalRootFactory>;
}

export const [ModalProvider, useModalContext] = createSafeContext<ModalContextValue>(
  'Modal component was not found in tree'
);
