import type { Octane } from 'octane/jsx-runtime';
type NativeDivProps = MantineIntrinsicProps<'div'>;
import { Box } from '../../../core';

export interface ThumbProps extends NativeDivProps {
  variant?: string;
  position: { x: number; y: number };
}

export function Thumb({ position, ...others }: ThumbProps) {
  return (
    <Box
      __vars={{
        '--thumb-y-offset': `${position.y * 100}%`,
        '--thumb-x-offset': `${position.x * 100}%`,
      }}
      {...others}
    />
  );
}

Thumb.displayName = '@mantine/core/ColorPickerThumb';
