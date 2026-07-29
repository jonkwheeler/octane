import type { OctaneNode } from 'octane';
import { useLayoutEffect, useRef } from 'octane';
import { useMergedRef } from '@octanejs/mantine-hooks';
import {
  Box,
  BoxProps,
  createVarsResolver,
  ElementProps,
  factory,
  Factory,
  getSpacing,
  MantineSpacing,
  StylesApiProps,
  useProps,
  useStyles,
} from '../../core';
import classes from './Breadcrumbs.module.css';

export type BreadcrumbsStylesNames = 'root' | 'separator' | 'breadcrumb';
export type BreadcrumbsCssVariables = {
  root: '--bc-separator-margin';
};

export interface BreadcrumbsProps
  extends BoxProps, StylesApiProps<BreadcrumbsFactory>, ElementProps<'div'> {
  /** Separator between children @default '/' */
  separator?: OctaneNode;

  /** Controls spacing between separator and breadcrumb @default 'xs' */
  separatorMargin?: MantineSpacing;

  /** React nodes that should be separated with `separator` */
  children: OctaneNode;
}

export type BreadcrumbsFactory = Factory<{
  props: BreadcrumbsProps;
  ref: HTMLDivElement;
  stylesNames: BreadcrumbsStylesNames;
  vars: BreadcrumbsCssVariables;
}>;

const defaultProps = {
  separator: '/',
} satisfies Partial<BreadcrumbsProps>;

const varsResolver = createVarsResolver<BreadcrumbsFactory>((_, { separatorMargin }) => ({
  root: {
    '--bc-separator-margin': getSpacing(separatorMargin),
  },
}));

export const Breadcrumbs = factory<BreadcrumbsFactory>((_props) => {
  const props = useProps('Breadcrumbs', defaultProps, _props);
  const {
    classNames,
    className,
    style,
    styles,
    unstyled,
    vars,
    children,
    separator,
    separatorMargin,
    attributes,
    ref,
    ...others
  } = props;

  const getStyles = useStyles<BreadcrumbsFactory>({
    name: 'Breadcrumbs',
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

  const rootRef = useRef<HTMLDivElement | null>(null);
  const mergedRef = useMergedRef(ref, rootRef);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }

    root.querySelectorAll(':scope > [data-mantine-breadcrumb-separator]').forEach((node) => {
      node.remove();
    });

    const childElements = Array.from(root.children);
    const breadcrumbStyles = getStyles('breadcrumb');
    const separatorStyles = getStyles('separator');
    const separatorText =
      typeof separator === 'string' || typeof separator === 'number' ? String(separator) : '';

    childElements.forEach((child, index) => {
      if (breadcrumbStyles.className) {
        child.classList.add(...breadcrumbStyles.className.split(' ').filter(Boolean));
      }
      if (breadcrumbStyles.style && typeof breadcrumbStyles.style === 'object') {
        Object.assign((child as HTMLElement).style, breadcrumbStyles.style);
      }

      if (index < childElements.length - 1) {
        const separatorElement = document.createElement('div');
        separatorElement.dataset.mantineBreadcrumbSeparator = 'true';
        separatorElement.textContent = separatorText;
        if (separatorStyles.className) {
          separatorElement.className = separatorStyles.className;
        }
        if (separatorStyles.style && typeof separatorStyles.style === 'object') {
          Object.assign(separatorElement.style, separatorStyles.style);
        }
        child.after(separatorElement);
      }
    });
  }, [children, separator]);

  return (
    <Box {...getStyles('root')} {...others} ref={mergedRef}>
      {children}
    </Box>
  );
});

Breadcrumbs.classes = classes;
Breadcrumbs.varsResolver = varsResolver;
Breadcrumbs.displayName = '@mantine/core/Breadcrumbs';

export declare namespace Breadcrumbs {
  export type Props = BreadcrumbsProps;
  export type StylesNames = BreadcrumbsStylesNames;
  export type CssVariables = BreadcrumbsCssVariables;
  export type Factory = BreadcrumbsFactory;
}
