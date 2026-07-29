import type {
  SplitterCssVariables,
  SplitterFactory,
  SplitterProps,
  SplitterStylesNames,
} from './Splitter.tsrx';
import type { SplitterContextValue } from './Splitter.context';
import type { SplitterPaneProps, SplitterPaneStylesNames } from './SplitterPane/SplitterPane.tsrx';

export { Splitter } from './Splitter.tsrx';
export { SplitterPane } from './SplitterPane/SplitterPane.tsrx';
export { useSplitterContext } from './Splitter.context';

export type {
  SplitterProps,
  SplitterStylesNames,
  SplitterCssVariables,
  SplitterFactory,
  SplitterPaneProps,
  SplitterPaneStylesNames,
  SplitterContextValue,
};

export declare namespace Splitter {
  export type Props = SplitterProps;
  export type StylesNames = SplitterStylesNames;
  export type CssVariables = SplitterCssVariables;
  export type Factory = SplitterFactory;
  export type ContextValue = SplitterContextValue;

  export namespace Pane {
    export type Props = SplitterPaneProps;
    export type StylesNames = SplitterPaneStylesNames;
  }
}
