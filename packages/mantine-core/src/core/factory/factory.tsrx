import type { ElementDescriptor, OctaneNode } from 'octane';
import type { MantineThemeComponent } from '../MantineProvider';
import type { ClassNames, PartialVarsResolver, Styles, VarsResolver } from '../styles-api';

export type DataAttributes = Record<`data-${string}`, any>;

export interface FactoryPayload {
  props: Record<string, any>;
  ctx?: any;
  ref?: any;
  stylesNames?: string;
  vars?: any;
  variant?: string;
  staticComponents?: Record<string, any>;

  // Compound components cannot have classNames, styles and vars on MantineProvider
  compound?: boolean;

  // Component signature, used only for generic components
  signature?: any;
}

export interface ExtendCompoundComponent<Payload extends FactoryPayload> {
  defaultProps?: Partial<Payload['props']> & DataAttributes;
}

export interface ExtendsRootComponent<Payload extends FactoryPayload> {
  defaultProps?: Partial<Payload['props']> & DataAttributes & { component?: any };
  classNames?: ClassNames<Payload>;
  styles?: Styles<Payload>;
  vars?: PartialVarsResolver<Payload>;
}

export type ExtendComponent<Payload extends FactoryPayload> = Payload['compound'] extends true
  ? ExtendCompoundComponent<Payload>
  : ExtendsRootComponent<Payload>;

export type StaticComponents<Input> =
  Input extends Record<string, any> ? Input : Record<string, never>;

export interface ThemeExtend<Payload extends FactoryPayload> {
  extend: (input: ExtendComponent<Payload>) => MantineThemeComponent;
}

export type ComponentClasses<Payload extends FactoryPayload> = {
  classes: Payload['stylesNames'] extends string ? Record<string, string> : never;
};

export type MantineComponentStaticProperties<Payload extends FactoryPayload> =
  ThemeExtend<Payload> &
    ComponentClasses<Payload> &
    StaticComponents<Payload['staticComponents']> &
    ComponentVariablesResolver<Payload> &
    FactoryComponentWithProps<Payload>;

export interface PlaceholderPolymorphicProps {
  component?: any;
  renderRoot?: (props: Record<string, any>) => OctaneNode;
}

export type FactoryComponentWithProps<Payload extends FactoryPayload> = {
  withProps: (
    props: Partial<Payload['props']>
  ) => MantineComponentCallable<
    Payload['props'] & { ref?: OctaneRef<Payload['ref']> } & PlaceholderPolymorphicProps
  >;
};

export type ComponentVariablesResolver<Payload extends FactoryPayload> =
  Payload['vars'] extends Record<string, any> ? { varsResolver: VarsResolver<Payload> } : {};

export type MantineComponentCallable<Props> = ((props: Props) => ElementDescriptor) & {
  displayName?: string;
};

export type MantineComponent<Payload extends FactoryPayload> = MantineComponentCallable<
  Payload['props'] &
    { ref?: OctaneRef<Payload['ref']> } & {
      component?: any;
      renderRoot?: (props: Record<string, any>) => OctaneNode;
    }
> &
  MantineComponentStaticProperties<Payload>;

export function identity<T>(value: T): T {
  return value;
}

export function factory<Payload extends FactoryPayload>(
  ui: (props: Payload['props'] & { ref?: OctaneRef<Payload['ref']> }) => OctaneNode
) {
  const Component = ui as any;
  Component.extend = identity as any;
  Component.withProps = (fixedProps: any) => {
    const Extended = (props: any) => <Component {...fixedProps} {...props} />;
    Extended.extend = Component.extend;
    Extended.displayName = `WithProps(${Component.displayName})`;
    return Extended;
  };

  return Component as MantineComponent<Payload>;
}

export function genericFactory<Payload extends FactoryPayload>(ui: Payload['signature']) {
  return factory(ui as any) as Payload['signature'] &
    MantineComponentStaticProperties<Payload> & { displayName?: string };
}
