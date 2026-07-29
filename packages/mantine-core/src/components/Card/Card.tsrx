import type { OctaneNode } from 'octane';
import { useLayoutEffect, useRef } from 'octane';
import { useMergedRef } from '@octanejs/mantine-hooks';
import {
  BoxProps,
  createVarsResolver,
  getSpacing,
  MantineRadius,
  MantineShadow,
  MantineSpacing,
  polymorphicFactory,
  PolymorphicFactory,
  StylesApiProps,
  useProps,
  useStyles,
} from '../../core';
import { Paper } from '../Paper';
import { CardProvider } from './Card.context';
import { CardSection, type CardSectionProps } from './CardSection/CardSection.tsrx';
import classes from './Card.module.css';
export type CardStylesNames = 'root' | 'section';
export type CardCssVariables = {
  root: '--card-padding';
};

export interface CardProps extends BoxProps, StylesApiProps<CardFactory> {
  /** Key of `theme.shadows` or any valid CSS value to set `box-shadow` */
  shadow?: MantineShadow;

  /** Key of `theme.radius` or any valid CSS value to set border-radius, numbers are converted to rem @default theme.defaultRadius */
  radius?: MantineRadius;

  /** Adds border to the card */
  withBorder?: boolean;

  /** Key of `theme.spacing` or any valid CSS value to set padding @default 'md' */
  padding?: MantineSpacing;

  /** Card content */
  children?: OctaneNode;

  /** Card orientation @default 'vertical' */
  orientation?: 'horizontal' | 'vertical';
}

export type CardFactory = PolymorphicFactory<{
  props: CardProps;
  defaultRef: HTMLDivElement;
  defaultComponent: 'div';
  stylesNames: CardStylesNames;
  vars: CardCssVariables;
  staticComponents: {
    Section: typeof CardSection;
  };
}>;

const varsResolver = createVarsResolver<CardFactory>((_, { padding }) => ({
  root: {
    '--card-padding': getSpacing(padding),
  },
}));

const defaultProps = {
  orientation: 'vertical',
} satisfies Partial<CardProps>;

export const Card = polymorphicFactory<CardFactory>((_props) => {
  const props = useProps('Card', defaultProps, _props);
  const {
    classNames,
    className,
    style,
    styles,
    unstyled,
    vars,
    children,
    padding,
    attributes,
    orientation,
    ref,
    ...others
  } = props;

  const getStyles = useStyles<CardFactory>({
    name: 'Card',
    props,
    classes,
    className,
    style,
    classNames,
    styles,
    unstyled,
    attributes,
    vars,
    varsResolver,
  });

  const rootRef = useRef<HTMLDivElement | null>(null);
  const mergedRef = useMergedRef(ref, rootRef);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }

    const sections = Array.from(
      root.querySelectorAll<HTMLElement>(':scope > [data-mantine-card-section]'),
    );
    sections.forEach((section, index) => {
      if (index === 0) {
        section.setAttribute('data-first-section', 'true');
      } else {
        section.removeAttribute('data-first-section');
      }
      if (index === sections.length - 1) {
        section.setAttribute('data-last-section', 'true');
      } else {
        section.removeAttribute('data-last-section');
      }
    });
  }, [children]);

  return (
    <CardProvider value={{ getStyles, orientation }}>
      <Paper
        unstyled={unstyled}
        data-orientation={orientation}
        {...getStyles('root')}
        {...others}
        ref={mergedRef}
      >
        {children}
      </Paper>
    </CardProvider>
  );
});

Card.classes = classes;
Card.varsResolver = varsResolver;
Card.displayName = '@mantine/core/Card';
Card.Section = CardSection;

export declare namespace Card {
  export type Props = CardProps;
  export type StylesNames = CardStylesNames;
  export type CssVariables = CardCssVariables;
  export type Factory = CardFactory;
  export type SectionProps = CardSectionProps;

  export namespace Section {
    export type Props = CardSectionProps;
  }
}
