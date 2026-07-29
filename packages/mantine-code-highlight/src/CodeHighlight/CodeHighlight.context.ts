import { createSafeContext, GetStylesApi } from '@octanejs/mantine-core';
import type { CodeHighlightFactory } from './CodeHighlight.tsrx';

export interface CodeHighlightContextValue {
  getStyles: GetStylesApi<CodeHighlightFactory>;
  codeColorScheme: 'light' | 'dark' | (string & {}) | undefined;
}

export const [CodeHighlightContextProvider, useCodeHighlightContext] =
  createSafeContext<CodeHighlightContextValue>(
    'CodeHighlightProvider was not found in the component tree'
  );
