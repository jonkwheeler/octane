import { createSafeContext, GetStylesApi } from '@octanejs/mantine-core';
import type { CarouselFactory } from './Carousel';

export interface CarouselContextValue {
  getStyles: GetStylesApi<CarouselFactory>;
  orientation: 'horizontal' | 'vertical' | undefined;
}

export const [CarouselProvider, useCarouselContext] = createSafeContext<CarouselContextValue>(
  'Carousel component was not found in tree'
);
