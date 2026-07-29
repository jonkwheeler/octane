import type {
  DataListCssVariables,
  DataListFactory,
  DataListProps,
  DataListStylesNames,
} from './DataList.tsrx';
import type { DataListContextValue } from './DataList.context';
import type {
  DataListItemFactory,
  DataListItemProps,
  DataListItemStylesNames,
} from './DataListItem/DataListItem.tsrx';
import type {
  DataListItemLabelFactory,
  DataListItemLabelProps,
  DataListItemLabelStylesNames,
} from './DataListItemLabel/DataListItemLabel.tsrx';
import type {
  DataListItemValueFactory,
  DataListItemValueProps,
  DataListItemValueStylesNames,
} from './DataListItemValue/DataListItemValue.tsrx';

export { DataList } from './DataList.tsrx';
export { DataListItem } from './DataListItem/DataListItem.tsrx';
export { DataListItemLabel } from './DataListItemLabel/DataListItemLabel.tsrx';
export { DataListItemValue } from './DataListItemValue/DataListItemValue.tsrx';
export { useDataListContext } from './DataList.context';

export type {
  DataListProps,
  DataListStylesNames,
  DataListCssVariables,
  DataListFactory,
  DataListItemProps,
  DataListItemStylesNames,
  DataListItemFactory,
  DataListItemLabelProps,
  DataListItemLabelStylesNames,
  DataListItemLabelFactory,
  DataListItemValueProps,
  DataListItemValueStylesNames,
  DataListItemValueFactory,
  DataListContextValue,
};

export declare namespace DataList {
  export type Props = DataListProps;
  export type StylesNames = DataListStylesNames;
  export type CssVariables = DataListCssVariables;
  export type Factory = DataListFactory;

  export namespace Item {
    export type Props = DataListItemProps;
    export type StylesNames = DataListItemStylesNames;
    export type Factory = DataListItemFactory;
  }

  export namespace ItemLabel {
    export type Props = DataListItemLabelProps;
    export type StylesNames = DataListItemLabelStylesNames;
    export type Factory = DataListItemLabelFactory;
  }

  export namespace ItemValue {
    export type Props = DataListItemValueProps;
    export type StylesNames = DataListItemValueStylesNames;
    export type Factory = DataListItemValueFactory;
  }
}
