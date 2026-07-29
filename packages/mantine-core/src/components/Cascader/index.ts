import type {
  CascaderFactory,
  CascaderFormatValue,
  CascaderFormatValueInput,
  CascaderOption,
  CascaderProps,
  CascaderStylesNames,
} from './Cascader.tsrx';

export { Cascader } from './Cascader.tsrx';
export type { CascaderFlatPath } from './flatten-cascader-paths';
export { flattenCascaderPaths } from './flatten-cascader-paths';
export { getCascaderPathOptions } from './get-cascader-path-options';
export type {
  CascaderProps,
  CascaderStylesNames,
  CascaderFactory,
  CascaderOption,
  CascaderFormatValue,
  CascaderFormatValueInput,
};

export declare namespace Cascader {
  export type Props = CascaderProps;
  export type StylesNames = CascaderStylesNames;
  export type Factory = CascaderFactory;
  export type Option = CascaderOption;
}
