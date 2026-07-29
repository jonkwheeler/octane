import type {
  PaginationCssVariables,
  PaginationFactory,
  PaginationProps,
  PaginationStylesNames,
} from './Pagination.tsrx';
import type { PaginationContextValue } from './Pagination.context';
import type { PaginationControlProps } from './PaginationControl/PaginationControl.tsrx';
import type { PaginationDotsProps } from './PaginationDots/PaginationDots.tsrx';
import type { PaginationEdgeProps } from './PaginationEdges/PaginationEdges.tsrx';
import type { PaginationItemsProps } from './PaginationItems/PaginationItems.tsrx';
import type {
  PaginationFormatLabel,
  PaginationLabelProps,
} from './PaginationLabel/PaginationLabel.tsrx';
import type { PaginationRootProps } from './PaginationRoot/PaginationRoot.tsrx';

export { Pagination } from './Pagination.tsrx';
export { PaginationControl } from './PaginationControl/PaginationControl.tsrx';
export { PaginationDots } from './PaginationDots/PaginationDots.tsrx';
export {
  PaginationFirst,
  PaginationLast,
  PaginationNext,
  PaginationPrevious,
} from './PaginationEdges/PaginationEdges.tsrx';
export { PaginationItems } from './PaginationItems/PaginationItems.tsrx';
export { PaginationLabel } from './PaginationLabel/PaginationLabel.tsrx';
export { PaginationRoot } from './PaginationRoot/PaginationRoot.tsrx';
export { usePaginationContext } from './Pagination.context';

export type {
  PaginationProps,
  PaginationStylesNames,
  PaginationCssVariables,
  PaginationFactory,
  PaginationRootProps,
  PaginationControlProps,
  PaginationDotsProps,
  PaginationEdgeProps,
  PaginationItemsProps,
  PaginationLabelProps,
  PaginationFormatLabel,
  PaginationContextValue,
};
