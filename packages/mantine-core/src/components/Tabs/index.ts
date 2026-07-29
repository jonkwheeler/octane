import type {
  TabsCssVariables,
  TabsFactory,
  TabsProps,
  TabsStylesNames,
  TabsVariant,
} from './Tabs.tsrx';
import type { TabsContextValue } from './Tabs.context';
import type { TabsListProps, TabsListStylesNames } from './TabsList/TabsList.tsrx';
import type { TabsPanelProps, TabsPanelStylesNames } from './TabsPanel/TabsPanel.tsrx';
import type { TabsTabProps, TabsTabStylesNames } from './TabsTab/TabsTab.tsrx';

export { Tabs } from './Tabs.tsrx';
export { TabsList } from './TabsList/TabsList.tsrx';
export { TabsTab } from './TabsTab/TabsTab.tsrx';
export { TabsPanel } from './TabsPanel/TabsPanel.tsrx';
export { useTabsContext } from './Tabs.context';

export type {
  TabsProps,
  TabsStylesNames,
  TabsCssVariables,
  TabsFactory,
  TabsVariant,
  TabsTabProps,
  TabsTabStylesNames,
  TabsPanelProps,
  TabsPanelStylesNames,
  TabsListProps,
  TabsListStylesNames,
  TabsContextValue,
};
