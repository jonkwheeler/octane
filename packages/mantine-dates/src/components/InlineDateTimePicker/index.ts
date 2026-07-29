import { DatePickerType } from '../../types';
import type {
  InlineDateTimePickerFactory,
  InlineDateTimePickerProps,
  InlineDateTimePickerStylesNames,
} from './InlineDateTimePicker.tsrx';

export { InlineDateTimePicker } from './InlineDateTimePicker.tsrx';

export type {
  InlineDateTimePickerProps,
  InlineDateTimePickerStylesNames,
  InlineDateTimePickerFactory,
};

export namespace InlineDateTimePicker {
  export type Props<Type extends DatePickerType> = InlineDateTimePickerProps<Type>;
  export type StylesNames = InlineDateTimePickerStylesNames;
  export type Factory = InlineDateTimePickerFactory;
}
