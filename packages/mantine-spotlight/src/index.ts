import type {
  SpotlightActionData,
  SpotlightActionGroupData,
  SpotlightFactory,
  SpotlightFilterFunction,
  SpotlightProps,
  SpotlightStylesNames,
} from './Spotlight';
import type { SpotlightActionProps, SpotlightActionStylesNames } from './SpotlightAction';
import type {
  SpotlightActionsGroupProps,
  SpotlightActionsGroupStylesNames,
} from './SpotlightActionsGroup';
import type {
  SpotlightActionsListProps,
  SpotlightActionsListStylesNames,
} from './SpotlightActionsList';
import type { SpotlightEmptyProps, SpotlightEmptyStylesNames } from './SpotlightEmpty';
import type { SpotlightFooterProps, SpotlightFooterStylesNames } from './SpotlightFooter';
import type { SpotlightRootProps, SpotlightRootStylesNames } from './SpotlightRoot';
import type { SpotlightSearchProps, SpotlightSearchStylesNames } from './SpotlightSearch';

export {
  spotlight,
  createSpotlight,
  createSpotlightStore,
  useSpotlight,
  openSpotlight,
  closeSpotlight,
  toggleSpotlight,
} from './spotlight.store';
export type { SpotlightState, SpotlightStore } from './spotlight.store';

export { isActionsGroup } from './is-actions-group';

export { Spotlight } from './Spotlight';
export { SpotlightRoot } from './SpotlightRoot';
export { SpotlightAction } from './SpotlightAction';
export { SpotlightActionsGroup } from './SpotlightActionsGroup';
export { SpotlightActionsList } from './SpotlightActionsList';
export { SpotlightEmpty } from './SpotlightEmpty';
export { SpotlightFooter } from './SpotlightFooter';
export { SpotlightSearch } from './SpotlightSearch';

export type {
  SpotlightProps,
  SpotlightStylesNames,
  SpotlightFactory,
  SpotlightFilterFunction,
  SpotlightActionData,
  SpotlightActionGroupData,
  SpotlightActionProps,
  SpotlightActionStylesNames,
  SpotlightActionsGroupProps,
  SpotlightActionsGroupStylesNames,
  SpotlightActionsListProps,
  SpotlightActionsListStylesNames,
  SpotlightEmptyProps,
  SpotlightEmptyStylesNames,
  SpotlightFooterProps,
  SpotlightFooterStylesNames,
  SpotlightSearchProps,
  SpotlightSearchStylesNames,
  SpotlightRootProps,
  SpotlightRootStylesNames,
};
