import type {
  TreeSelectFactory,
  TreeSelectMode,
  TreeSelectProps,
  TreeSelectStylesNames,
  TreeSelectValue,
} from './TreeSelect.tsrx';

export { TreeSelect } from './TreeSelect.tsrx';
export { TreeSelectOption } from './TreeSelectOption.tsrx';
export type { TreeSelectChevronAriaLabels, TreeSelectRenderNodePayload } from './TreeSelectOption.tsrx';
export type { CheckedStrategy } from './get-checked-values-by-strategy';
export type {
  TreeSelectProps,
  TreeSelectStylesNames,
  TreeSelectFactory,
  TreeSelectMode,
  TreeSelectValue,
};

export declare namespace TreeSelect {
  export type Props = TreeSelectProps;
  export type StylesNames = TreeSelectStylesNames;
  export type Factory = TreeSelectFactory;
  export type Mode = TreeSelectMode;
  export type Value<Mode extends TreeSelectMode> = TreeSelectValue<Mode>;
}
