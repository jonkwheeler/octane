import type { Octane } from 'octane/jsx-runtime';
import type { OctaneNode } from 'octane';
import { Box } from '../../../core';
import { Marks } from '../Marks/Marks.tsrx';
import { useSliderContext } from '../Slider.context';

export interface TrackProps {
  filled: number;
  offset?: number;
  marksOffset?: number;
  marks: { value: number; label?: OctaneNode }[] | undefined;
  min: number;
  max: number;
  value: number;
  startPointValue?: number;
  children: OctaneNode;
  disabled: boolean | undefined;
  inverted: boolean | undefined;
  containerProps?: MantineIntrinsicProps<'div'>;
}

export function Track({
  filled,
  children,
  offset,
  disabled,
  marksOffset,
  inverted,
  startPointValue,
  containerProps,
  ...others
}: TrackProps) {
  const { getStyles } = useSliderContext();

  return (
    <Box {...getStyles('trackContainer')} mod={{ disabled }} {...containerProps}>
      <Box {...getStyles('track')} mod={{ inverted, disabled }}>
        <Box
          mod={{ inverted, disabled }}
          __vars={{
            '--slider-bar-width': `calc(${filled}% + 2 * var(--slider-size))`,
            '--slider-bar-offset': `calc(${offset}% - var(--slider-size))`,
          }}
          {...getStyles('bar')}
        />

        {children}

        <Marks
          {...others}
          offset={marksOffset}
          disabled={disabled}
          inverted={inverted}
          startPointValue={startPointValue}
        />
      </Box>
    </Box>
  );
}

Track.displayName = '@mantine/core/SliderTrack';
