import type {
  ComboboxPopoverFactory,
  ComboboxPopoverProps,
  ComboboxPopoverStylesNames,
} from './ComboboxPopover.tsrx';
import type { ComboboxPopoverValue } from './ComboboxPopover.types';
import type { ComboboxPopoverTargetProps } from './ComboboxPopoverTarget.tsrx';

export { ComboboxPopover } from './ComboboxPopover.tsrx';
export { ComboboxPopoverTarget } from './ComboboxPopoverTarget.tsrx';

export type {
  ComboboxPopoverProps,
  ComboboxPopoverStylesNames,
  ComboboxPopoverFactory,
  ComboboxPopoverTargetProps,
  ComboboxPopoverValue,
};

export declare namespace ComboboxPopover {
  export type Props = ComboboxPopoverProps;
  export type StylesNames = ComboboxPopoverStylesNames;
  export type Factory = ComboboxPopoverFactory;

  export namespace Target {
    export type Props = ComboboxPopoverTargetProps;
  }
}
