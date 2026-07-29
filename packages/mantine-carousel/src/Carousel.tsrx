import { Children, createElement, useCallback, useEffect, useState, type OctaneNode } from 'octane';
import type { EmblaCarouselType, EmblaOptionsType, EmblaPluginType } from 'embla-carousel';
import { useEmblaCarousel } from './use-embla-carousel';
import {
  AccordionChevron,
  Box,
  BoxProps,
  createVarsResolver,
  DataAttributes,
  ElementProps,
  factory,
  Factory,
  getSpacing,
  MantineSpacing,
  rem,
  StyleProp,
  StylesApiProps,
  UnstyledButton,
  useDirection,
  useProps,
  useRandomClassName,
  useStyles,
  VisuallyHidden,
} from '@octanejs/mantine-core';
import { clamp, useId } from '@octanejs/mantine-hooks';
import { CarouselProvider, type CarouselContextValue } from './Carousel.context';
import { CarouselSlide } from './CarouselSlide/CarouselSlide.tsrx';
import {
  CarouselContainerVariables,
  CarouselVariables,
} from './CarouselVariables/CarouselVariables.tsrx';
import { getChevronRotation } from './get-chevron-rotation';
import classes from './Carousel.module.css';

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
  /** Options passed down to embla carousel */
  emblaOptions?: EmblaOptionsType;

  /** `Carousel.Slide` components */
  children?: OctaneNode;

  /** Called when next slide is shown */
  onNextSlide?: () => void;

  /** Called when previous slider is shown */
  onPreviousSlide?: () => void;

  /** Called with slide index when slide changes */
  onSlideChange?: (index: number) => void;

  /** Get embla API as ref */
  getEmblaApi?: (embla: EmblaCarouselType) => void;

  /** Props passed down to next control */
  nextControlProps?: MantineIntrinsicProps<'button'>;

  /** Props passed down to previous control */
  previousControlProps?: MantineIntrinsicProps<'button'>;

  /** Controls size of the next and previous controls @default 26 */
  controlSize?: React.CSSProperties['width'];

  /** Controls position of the next and previous controls, key of `theme.spacing` or any valid CSS value @default 'sm' */
  controlsOffset?: MantineSpacing;

  /** Controls slide width based on viewport width @default '100%' */
  slideSize?: StyleProp<string | number>;

  /** Key of theme.spacing or number to set gap between slides */
  slideGap?: StyleProp<MantineSpacing>;

  /** Carousel orientation @default 'horizontal' */
  orientation?: 'horizontal' | 'vertical';

  /** Determines type of queries used for responsive styles @default 'media' */
  type?: 'media' | 'container';

  /** Slides container `height`, required for vertical orientation */
  height?: React.CSSProperties['height'];

  /** Determines whether gap between slides should be treated as part of the slide size @default true */
  includeGapInSize?: boolean;

  /** Index of initial slide */
  initialSlide?: number;

  /** Determines whether next/previous controls should be displayed @default true */
  withControls?: boolean;

  /** Determines whether indicators should be displayed @default false */
  withIndicators?: boolean;

  /** A list of embla plugins */
  plugins?: EmblaPluginType[];

  /** Icon of the next control */
  nextControlIcon?: OctaneNode;

  /** Icon of the previous control */
  previousControlIcon?: OctaneNode;

  /** Determines whether arrow key should switch slides @default true */
  withKeyboardEvents?: boolean;

  /** Function to get props for indicator button */
  getIndicatorProps?: (index: number) => ElementProps<'button'> & DataAttributes;
}

export type CarouselFactory = Factory<{
  props: CarouselProps;
  ref: HTMLDivElement;
  stylesNames: CarouselStylesNames;
  vars: CarouselCssVariables;
  staticComponents: {
    Slide: typeof CarouselSlide;
  };
}>;

const defaultProps = {
  controlSize: 26,
  controlsOffset: 'sm',
  slideSize: '100%',
  slideGap: 0,
  orientation: 'horizontal',
  includeGapInSize: true,
  initialSlide: 0,
  withControls: true,
  withIndicators: false,
  withKeyboardEvents: true,
  type: 'media',
} satisfies Partial<CarouselProps>;

const defaultEmblaOptions: EmblaOptionsType = {
  align: 'center',
  loop: false,
  slidesToScroll: 1,
  dragFree: false,
  inViewThreshold: 0,
  skipSnaps: false,
  containScroll: 'trimSnaps',
};

const varsResolver = createVarsResolver<CarouselFactory>(
  (_, { height, controlSize, controlsOffset }) => ({
    root: {
      '--carousel-height': rem(height),
      '--carousel-control-size': rem(controlSize),
      '--carousel-controls-offset': getSpacing(controlsOffset),
    },
  })
);

export const Carousel = factory<CarouselFactory>((_props) => {
  const props = useProps('Carousel', defaultProps, _props);
  const {
    classNames,
    className,
    style,
    styles,
    unstyled,
    vars,
    children,
    getEmblaApi,
    onNextSlide,
    onPreviousSlide,
    onSlideChange,
    nextControlProps,
    previousControlProps,
    controlSize,
    controlsOffset,
    slideSize,
    slideGap,
    orientation,
    height,
    includeGapInSize,
    draggable,
    initialSlide,
    withControls,
    withIndicators,
    plugins,
    nextControlIcon,
    previousControlIcon,
    withKeyboardEvents,
    mod,
    type,
    emblaOptions,
    attributes,
    getIndicatorProps,
    id,
    ...others
  } = props;

  const getStyles = useStyles<CarouselFactory>({
    name: 'Carousel',
    classes,
    props,
    className,
    style,
    classNames,
    styles,
    unstyled,
    attributes,
    vars,
    varsResolver,
  });

  const _id = useId(id);

  const responsiveClassName = useRandomClassName();
  const { dir } = useDirection();

  const [emblaRefElement, embla] = useEmblaCarousel(
    {
      axis: orientation === 'horizontal' ? 'x' : 'y',
      direction: orientation === 'horizontal' ? dir : undefined,
      startIndex: initialSlide,
      ...defaultEmblaOptions,
      ...emblaOptions,
    },
    plugins
  );

  const [selected, setSelected] = useState(0);
  const [slidesCount, setSlidesCount] = useState(0);

  const handleScroll = useCallback((index: number) => embla && embla.scrollTo(index), [embla]);

  const handleSelect = useCallback(() => {
    if (!embla) {
      return;
    }
    const slide = embla.selectedScrollSnap();
    setSelected(slide);
    slide !== selected && onSlideChange?.(slide);
  }, [embla, setSelected, onSlideChange, selected]);

  const handlePrevious = useCallback(() => {
    embla?.scrollPrev();
    onPreviousSlide?.();
  }, [embla]);

  const handleNext = useCallback(() => {
    embla?.scrollNext();
    onNextSlide?.();
  }, [embla]);

  const handleKeydown = useCallback(
    (event: OctaneKeyboardEvent<HTMLDivElement>) => {
      if (withKeyboardEvents) {
        if (event.key === 'ArrowRight') {
          event.preventDefault();
          handleNext();
        }

        if (event.key === 'ArrowLeft') {
          event.preventDefault();
          handlePrevious();
        }

        if (event.key === 'Home') {
          event.preventDefault();
          embla?.scrollTo(0);
        }

        if (event.key === 'End') {
          event.preventDefault();
          embla?.scrollTo(embla.scrollSnapList().length - 1);
        }
      }
    },
    [embla, handleNext, handlePrevious]
  );

  useEffect(() => {
    if (embla) {
      getEmblaApi?.(embla);
      handleSelect();
      setSlidesCount(embla.scrollSnapList().length);
      embla.on('select', handleSelect);

      return () => {
        embla.off('select', handleSelect);
      };
    }

    return undefined;
  }, [embla, emblaOptions?.slidesToScroll, handleSelect]);

  useEffect(() => {
    if (embla) {
      embla.reInit();
      setSlidesCount(embla.scrollSnapList().length);
      setSelected((currentSelected) =>
        clamp(currentSelected, 0, Children.toArray(children).length - 1)
      );
    }
  }, [Children.toArray(children).length, emblaOptions?.slidesToScroll]);

  const canScrollPrev = embla?.canScrollPrev() || false;
  const canScrollNext = embla?.canScrollNext() || false;

  const handleIndicatorKeyDown = useCallback(
    (event: OctaneKeyboardEvent<HTMLButtonElement>, index: number) => {
      const isHorizontal = orientation === 'horizontal';
      const nextKey = isHorizontal ? 'ArrowRight' : 'ArrowDown';
      const prevKey = isHorizontal ? 'ArrowLeft' : 'ArrowUp';

      if (event.key === nextKey) {
        event.preventDefault();
        const nextIndex = index < slidesCount - 1 ? index + 1 : 0;
        handleScroll(nextIndex);
        const nextIndicator = event.currentTarget.parentElement?.children[nextIndex] as HTMLElement;
        nextIndicator?.focus();
      }

      if (event.key === prevKey) {
        event.preventDefault();
        const prevIndex = index > 0 ? index - 1 : slidesCount - 1;
        handleScroll(prevIndex);
        const prevIndicator = event.currentTarget.parentElement?.children[prevIndex] as HTMLElement;
        prevIndicator?.focus();
      }

      if (event.key === 'Home') {
        event.preventDefault();
        handleScroll(0);
        const firstIndicator = event.currentTarget.parentElement?.children[0] as HTMLElement;
        firstIndicator?.focus();
      }

      if (event.key === 'End') {
        event.preventDefault();
        handleScroll(slidesCount - 1);
        const lastIndicator = event.currentTarget.parentElement?.children[
          slidesCount - 1
        ] as HTMLElement;
        lastIndicator?.focus();
      }
    },
    [orientation, slidesCount, handleScroll]
  );

  const indicators = Array(slidesCount)
    .fill(0)
    .map((_, index) =>
      createElement(
        UnstyledButton as any,
        Object.assign(
          {},
          getStyles('indicator'),
          {
            key: index,
            role: 'tab',
            'aria-label': `Go to slide ${index + 1}`,
            'aria-selected': index === selected,
            tabIndex: index === selected ? 0 : -1,
            'data-active': index === selected || undefined,
            onClick: () => handleScroll(index),
            onKeyDown: (event: OctaneKeyboardEvent<HTMLButtonElement>) =>
              handleIndicatorKeyDown(event, index),
            'data-orientation': orientation,
            onMouseDown: (event: OctaneMouseEvent<HTMLButtonElement>) => event.preventDefault(),
          },
          getIndicatorProps?.(index)
        )
      )
    );
  const previousChevronRotation = getChevronRotation({
    dir,
    orientation,
    direction: 'previous',
  });
  const nextChevronRotation = getChevronRotation({
    dir,
    orientation,
    direction: 'next',
  });
  const previousIcon =
    typeof previousControlIcon !== 'undefined'
      ? previousControlIcon
      : createElement(AccordionChevron as any, {
          style: { transform: `rotate(${previousChevronRotation}deg)` },
        });
  const nextIcon =
    typeof nextControlIcon !== 'undefined'
      ? nextControlIcon
      : createElement(AccordionChevron as any, {
          style: { transform: `rotate(${nextChevronRotation}deg)` },
        });
  const previousButtonProps = Object.assign(
    {},
    previousControlProps as any,
    getStyles('control', {
      className: previousControlProps?.className,
      style: previousControlProps?.style,
    })
  );
  const nextButtonProps = Object.assign(
    {},
    getStyles('control', {
      className: nextControlProps?.className,
      style: nextControlProps?.style,
    }),
    nextControlProps as any
  );
  const previousButton = createElement(
    UnstyledButton as any,
    Object.assign({}, previousButtonProps, {
      'aria-controls': _id,
      'aria-label': 'Previous slide',
      'aria-disabled': !canScrollPrev,
      'data-inactive': !canScrollPrev || undefined,
      'data-type': 'previous',
      tabIndex: canScrollPrev ? 0 : -1,
      onClick: (event: OctaneMouseEvent<HTMLButtonElement>) => {
        handlePrevious();
        previousControlProps?.onClick?.(event);
      },
      children: previousIcon,
    })
  );
  const nextButton = createElement(
    UnstyledButton as any,
    Object.assign({}, nextButtonProps, {
      'aria-controls': _id,
      'aria-label': 'Next slide',
      'aria-disabled': !canScrollNext,
      'data-inactive': !canScrollNext || undefined,
      'data-type': 'next',
      tabIndex: canScrollNext ? 0 : -1,
      onClick: (event: OctaneMouseEvent<HTMLButtonElement>) => {
        handleNext();
        nextControlProps?.onClick?.(event);
      },
      children: nextIcon,
    })
  );
  const responsiveVariables = createElement(
    (type === 'container' ? CarouselContainerVariables : CarouselVariables) as any,
    Object.assign({}, props, { selector: `.${responsiveClassName}` })
  );
  const rootProps = Object.assign(
    {
      role: 'region',
      'aria-roledescription': 'carousel',
    },
    getStyles('root', { className: responsiveClassName }),
    others,
    {
      id: _id,
      mod: [{ orientation, 'include-gap-in-size': includeGapInSize }, mod],
      onKeyDownCapture: handleKeydown,
    },
  );
  const status = createElement(VisuallyHidden as any, {
    role: 'status',
    'aria-live': 'polite',
    'aria-atomic': 'true',
    children: slidesCount > 0 && `Slide ${selected + 1} of ${slidesCount}`,
  });
  const controls = withControls
    ? createElement(
        'div',
        Object.assign({}, getStyles('controls'), {
          'data-orientation': orientation,
          children: [previousButton, nextButton],
        })
      )
    : null;
  const container = createElement(
    'div',
    Object.assign({}, getStyles('container', { className: responsiveClassName }), {
      'data-orientation': orientation,
      children,
    })
  );
  const viewport = createElement(
    'div',
    Object.assign({}, getStyles('viewport'), {
      ref: emblaRefElement,
      'data-type': type,
      children: container,
    })
  );
  const indicatorList = withIndicators
    ? createElement(
        'div',
        Object.assign({}, getStyles('indicators'), {
          role: 'tablist',
          'aria-label': 'Slides',
          'data-orientation': orientation,
          children: indicators,
        })
      )
    : null;
  const root = createElement(
    Box as any,
    Object.assign({}, rootProps, {
      children: [status, controls, viewport, indicatorList],
    })
  );

  return createElement(CarouselProvider as any, {
    value: { getStyles, orientation },
    children: [responsiveVariables, root],
  });
});

Carousel.classes = classes;
Carousel.varsResolver = varsResolver;
Carousel.displayName = '@mantine/carousel/Carousel';
Carousel.Slide = CarouselSlide;

export declare namespace Carousel {
  export type Props = CarouselProps;
  export type CssVariables = CarouselCssVariables;
  export type Factory = CarouselFactory;
  export type StylesNames = CarouselStylesNames;
  export type ContextValue = CarouselContextValue;
}
