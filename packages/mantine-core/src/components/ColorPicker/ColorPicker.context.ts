import { createContext } from 'octane';
import { GetStylesApi } from '../../core';
import type { ColorPickerFactory } from './ColorPicker.tsrx';

interface ColorPickerContextValue {
  getStyles: GetStylesApi<ColorPickerFactory>;
  unstyled: boolean | undefined;
}

export const ColorPickerContext = createContext<ColorPickerContextValue | null>(null);
