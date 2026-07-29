import { createSafeContext, GetStylesApi } from '../../core';
import type { TimelineFactory } from './Timeline.tsrx';
import type { TimelineItemProps } from './TimelineItem/TimelineItem.tsrx';

interface ResolvedTimelineItem {
  align: 'right' | 'left';
  active: boolean;
  lineActive: boolean;
}

interface TimelineContextValue {
  getStyles: GetStylesApi<TimelineFactory>;
  resolveItem(props: TimelineItemProps): ResolvedTimelineItem;
}

export const [TimelineProvider, useTimelineContext] = createSafeContext<TimelineContextValue>(
  'Timeline component was not found in tree'
);
