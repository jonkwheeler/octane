import type { Octane } from 'octane/jsx-runtime';
export type Sizes = {
  content: number;
  viewport: number;
  scrollbar: {
    size: number;
    paddingStart: number;
    paddingEnd: number;
  };
};

export interface ScrollAreaScrollbarAxisPrivateProps {
  hasThumb: boolean;
  sizes: Sizes;
  onSizesChange: (sizes: Sizes) => void;
  onThumbChange: (thumb: HTMLDivElement | null) => void;
  onThumbPointerDown: (pointerPos: number) => void;
  onThumbPointerUp: () => void;
  onThumbPositionChange: () => void;
  onWheelScroll: (scrollPos: number) => void;
  onDragScroll: (pointerPos: number) => void;
}

type NativeDivProps = MantineIntrinsicProps<'div'>;

export interface ScrollAreaScrollbarAxisProps
  extends ScrollAreaScrollbarAxisPrivateProps, NativeDivProps {}
