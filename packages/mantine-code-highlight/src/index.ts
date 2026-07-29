import type {
  CodeHighlightCssVariables,
  CodeHighlightFactory,
  CodeHighlightProps,
  CodeHighlightStylesNames,
} from './CodeHighlight/CodeHighlight.tsrx';
import type { CodeHighlightContextValue } from './CodeHighlight/CodeHighlight.context';
import type { CodeHighlightControlProps } from './CodeHighlight/CodeHighlightControl/CodeHighlightControl.tsrx';
import type {
  InlineCodeHighlightCssVariables,
  InlineCodeHighlightFactory,
  InlineCodeHighlightProps,
  InlineCodeHighlightStylesNames,
} from './CodeHighlight/InlineCodeHighlight.tsrx';
import type { CodeHighlightAdapter } from './CodeHighlightProvider/CodeHighlightProvider.tsrx';
import type {
  CodeHighlightDefaultLanguage,
  CodeHighlightTabsCode,
  CodeHighlightTabsFactory,
  CodeHighlightTabsProps,
  CodeHighlightTabsStylesNames,
} from './CodeHighlightTabs/CodeHighlightTabs.tsrx';

export { CodeHighlight } from './CodeHighlight/CodeHighlight.tsrx';
export { InlineCodeHighlight } from './CodeHighlight/InlineCodeHighlight.tsrx';
export { CodeHighlightTabs } from './CodeHighlightTabs/CodeHighlightTabs.tsrx';
export { CodeHighlightControl } from './CodeHighlight/CodeHighlightControl/CodeHighlightControl.tsrx';
export { useCodeHighlightContext } from './CodeHighlight/CodeHighlight.context';

export {
  CodeHighlightAdapterProvider,
  useHighlight,
} from './CodeHighlightProvider/CodeHighlightProvider.tsrx';

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
