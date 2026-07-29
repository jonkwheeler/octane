import type {
  CodeHighlightCssVariables,
  CodeHighlightFactory,
  CodeHighlightProps,
  CodeHighlightStylesNames,
} from './CodeHighlight/CodeHighlight';
import type { CodeHighlightContextValue } from './CodeHighlight/CodeHighlight.context';
import type { CodeHighlightControlProps } from './CodeHighlight/CodeHighlightControl/CodeHighlightControl';
import type {
  InlineCodeHighlightCssVariables,
  InlineCodeHighlightFactory,
  InlineCodeHighlightProps,
  InlineCodeHighlightStylesNames,
} from './CodeHighlight/InlineCodeHighlight';
import type { CodeHighlightAdapter } from './CodeHighlightProvider/CodeHighlightProvider';
import type {
  CodeHighlightDefaultLanguage,
  CodeHighlightTabsCode,
  CodeHighlightTabsFactory,
  CodeHighlightTabsProps,
  CodeHighlightTabsStylesNames,
} from './CodeHighlightTabs/CodeHighlightTabs';

export { CodeHighlight } from './CodeHighlight/CodeHighlight';
export { InlineCodeHighlight } from './CodeHighlight/InlineCodeHighlight';
export { CodeHighlightTabs } from './CodeHighlightTabs/CodeHighlightTabs';
export { CodeHighlightControl } from './CodeHighlight/CodeHighlightControl/CodeHighlightControl';
export { useCodeHighlightContext } from './CodeHighlight/CodeHighlight.context';

export {
  CodeHighlightAdapterProvider,
  useHighlight,
} from './CodeHighlightProvider/CodeHighlightProvider';

export { createHighlightJsAdapter } from './CodeHighlightProvider/adapters/highlight-js-adapter';
export {
  createShikiAdapter,
  stripShikiCodeBlocks,
} from './CodeHighlightProvider/adapters/shiki-adapter';
export { plainTextAdapter } from './CodeHighlightProvider/adapters/plain-text-adapter';

export type {
  CodeHighlightProps,
  CodeHighlightStylesNames,
  CodeHighlightCssVariables,
  CodeHighlightFactory,
  CodeHighlightTabsProps,
  CodeHighlightTabsStylesNames,
  CodeHighlightTabsCode,
  CodeHighlightTabsFactory,
  CodeHighlightDefaultLanguage,
  InlineCodeHighlightProps,
  InlineCodeHighlightStylesNames,
  InlineCodeHighlightCssVariables,
  InlineCodeHighlightFactory,
  CodeHighlightControlProps,
  CodeHighlightContextValue,
  CodeHighlightAdapter,
};
