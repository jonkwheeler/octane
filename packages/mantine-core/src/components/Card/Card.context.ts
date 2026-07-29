import { createSafeContext, GetStylesApi } from '../../core';
import type { CardFactory } from './Card.tsrx';

export interface CardContextValue {
  getStyles: GetStylesApi<CardFactory>;
  orientation: 'horizontal' | 'vertical';
}

export const [CardProvider, useCardContext] = createSafeContext<CardContextValue>(
  'Card component was not found in tree'
);
