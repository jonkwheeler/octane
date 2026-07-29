import type { FlipOptions, InlineOptions, ShiftOptions, SizeOptions } from '@octanejs/floating-ui';

export type PopoverWidth = 'target' | React.CSSProperties['width'] | null;

export interface PopoverMiddlewares {
  shift?: boolean | ShiftOptions;
  flip?: boolean | FlipOptions;
  inline?: boolean | InlineOptions;
  size?: boolean | SizeOptions;
}
