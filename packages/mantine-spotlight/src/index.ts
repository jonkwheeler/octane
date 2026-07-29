import type {
  SpotlightActionData,
  SpotlightActionGroupData,
  SpotlightFactory,
  SpotlightFilterFunction,
  SpotlightProps,
  SpotlightStylesNames,
} from './Spotlight.tsrx';
import type { SpotlightActionProps, SpotlightActionStylesNames } from './SpotlightAction.tsrx';
import type {
  SpotlightActionsGroupProps,
  SpotlightActionsGroupStylesNames,
} from './SpotlightActionsGroup.tsrx';
import type {
  SpotlightActionsListProps,
  SpotlightActionsListStylesNames,
} from './SpotlightActionsList.tsrx';
import type { SpotlightEmptyProps, SpotlightEmptyStylesNames } from './SpotlightEmpty.tsrx';
import type { SpotlightFooterProps, SpotlightFooterStylesNames } from './SpotlightFooter.tsrx';
import type { SpotlightRootProps, SpotlightRootStylesNames } from './SpotlightRoot.tsrx';
import type { SpotlightSearchProps, SpotlightSearchStylesNames } from './SpotlightSearch.tsrx';

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

export { Spotlight } from './Spotlight.tsrx';
export { SpotlightRoot } from './SpotlightRoot.tsrx';
export { SpotlightAction } from './SpotlightAction.tsrx';
export { SpotlightActionsGroup } from './SpotlightActionsGroup.tsrx';
export { SpotlightActionsList } from './SpotlightActionsList.tsrx';
export { SpotlightEmpty } from './SpotlightEmpty.tsrx';
export { SpotlightFooter } from './SpotlightFooter.tsrx';
export { SpotlightSearch } from './SpotlightSearch.tsrx';

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
