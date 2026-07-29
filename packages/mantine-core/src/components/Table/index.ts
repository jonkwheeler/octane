import type {
  TableCssVariables,
  TableData,
  TableFactory,
  TableProps,
  TableStylesNames,
} from './Table.tsrx';
import type {
  TableCaptionProps,
  TableTbodyProps,
  TableTdProps,
  TableTfootProps,
  TableTheadProps,
  TableThProps,
  TableTrProps,
} from './Table.components.tsrx';
import type { TableContextValue } from './Table.context';
import type { TableScrollContainerProps } from './TableScrollContainer.tsrx';

export { Table } from './Table.tsrx';
export {
  TableCaption,
  TableTbody,
  TableTd,
  TableTfoot,
  TableTr,
  TableTh,
  TableThead,
} from './Table.components.tsrx';
export { TableScrollContainer } from './TableScrollContainer.tsrx';
export { useTableContext } from './Table.context';

export type {
  TableProps,
  TableStylesNames,
  TableCssVariables,
  TableFactory,
  TableData,
  TableTbodyProps,
  TableTdProps,
  TableThProps,
  TableTrProps,
  TableCaptionProps,
  TableTfootProps,
  TableTheadProps,
  TableScrollContainerProps,
  TableContextValue,
};
