import type { ElementDescriptor } from 'octane';
import type { Octane } from 'octane/jsx-runtime';

type ExtendedProps<Props = {}, OverrideProps = {}> = OverrideProps &
  Omit<Props, keyof OverrideProps>;

type ElementType = keyof Octane.JSX.IntrinsicElements | ((props: any) => any);

type PropsOf<C extends ElementType> = C extends keyof Octane.JSX.IntrinsicElements
  ? Octane.JSX.IntrinsicElements[C]
  : C extends (props: infer Props) => any
    ? Props
    : Record<string, any>;

type ComponentProp<C> = {
  component?: C;
};

type InheritedProps<C extends ElementType, Props = {}> = ExtendedProps<PropsOf<C>, Props>;

export type PolymorphicRef<C> = C extends ElementType
  ? PropsOf<C> extends { ref?: infer Ref }
    ? Ref
    : never
  : never;

export type PolymorphicComponentProps<C, Props = {}> = C extends ElementType
  ? InheritedProps<C, Props & ComponentProp<C>> & {
      ref?: PolymorphicRef<C>;
      renderRoot?: (props: any) => any;
    }
  : Props & { component: ElementType; renderRoot?: (props: Record<string, any>) => any };

interface ComponentProperties {
  displayName?: string;
}

export function createPolymorphicComponent<
  ComponentDefaultType,
  Props,
  StaticComponents = Record<string, never>,
>(component: any) {
  type ComponentProps<C> = PolymorphicComponentProps<C, Props>;

  type _PolymorphicComponent = <C = ComponentDefaultType>(
    props: ComponentProps<C>
  ) => ElementDescriptor;

  type PolymorphicComponent = _PolymorphicComponent & ComponentProperties & StaticComponents;

  return component as PolymorphicComponent;
}

export const polymorphic = createPolymorphicComponent;
