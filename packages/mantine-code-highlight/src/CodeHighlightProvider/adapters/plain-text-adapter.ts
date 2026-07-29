import type { CodeHighlightAdapter } from '../CodeHighlightProvider.tsrx';

export const plainTextAdapter: CodeHighlightAdapter = {
  getHighlighter:
    () =>
    ({ code }) => ({ highlightedCode: code, isHighlighted: false }),
};
