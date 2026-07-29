import type {
	BoxProps,
	DataAttributes,
	ElementProps,
	Factory,
	StyleProp,
	StylesApiProps,
} from '@octanejs/mantine-core';
import type { OctaneNode } from 'octane';
import type { EmblaCarouselType, EmblaOptionsType, EmblaPluginType } from 'embla-carousel';
import type { CarouselSlide } from './CarouselSlide/CarouselSlide.tsrx';

export type CarouselStylesNames =
	| 'slide'
	| 'root'
	| 'viewport'
	| 'container'
	| 'controls'
	| 'control'
	| 'indicators'
	| 'indicator';
export type CarouselCssVariables = {
	root: '--carousel-height' | '--carousel-control-size' | '--carousel-controls-offset';
};
export interface CarouselProps
	extends BoxProps, StylesApiProps<CarouselFactory>, ElementProps<'div'> {
	emblaOptions?: EmblaOptionsType;
	children?: OctaneNode;
	onNextSlide?: () => void;
	onPreviousSlide?: () => void;
	onSlideChange?: (index: number) => void;
	getEmblaApi?: (embla: EmblaCarouselType) => void;
	nextControlProps?: MantineIntrinsicProps<'button'>;
	previousControlProps?: MantineIntrinsicProps<'button'>;
	controlSize?: React.CSSProperties['width'];
	controlsOffset?: string | number;
	slideSize?: StyleProp<string | number>;
	slideGap?: StyleProp<string | number>;
	orientation?: 'horizontal' | 'vertical';
	type?: 'media' | 'container';
	height?: React.CSSProperties['height'];
	includeGapInSize?: boolean;
	initialSlide?: number;
	withControls?: boolean;
	withIndicators?: boolean;
	plugins?: EmblaPluginType[];
	nextControlIcon?: OctaneNode;
	previousControlIcon?: OctaneNode;
	withKeyboardEvents?: boolean;
	getIndicatorProps?: (index: number) => ElementProps<'button'> & DataAttributes;
}
export type CarouselFactory = Factory<{
	props: CarouselProps;
	ref: HTMLDivElement;
	stylesNames: CarouselStylesNames;
	vars: CarouselCssVariables;
	staticComponents: { Slide: typeof CarouselSlide };
}>;
export declare const Carousel: ((props: CarouselProps & { ref?: OctaneRef<HTMLDivElement> }) => OctaneNode) & {
	Slide: typeof CarouselSlide;
	classes: Record<string, string>;
	displayName?: string;
};
