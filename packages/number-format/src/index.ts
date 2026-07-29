import NumberFormatBase from './number_format_base.tsrx';
import NumericFormat from './numeric_format.tsrx';
import PatternFormat from './pattern_format.tsrx';
import {
  format as numericFormatter,
  removeFormatting as removeNumericFormat,
  getCaretBoundary as getNumericCaretBoundary,
  useNumericFormat,
} from './numeric_format.tsrx';

import {
  format as patternFormatter,
  removeFormatting as removePatternFormat,
  getCaretBoundary as getPatternCaretBoundary,
  usePatternFormat,
} from './pattern_format.tsrx';

export { NumberFormatBase, NumericFormat, PatternFormat };

export type {
  NumericFormatProps,
  NumberFormatBaseProps,
  PatternFormatProps,
  SourceInfo,
  NumberFormatValues,
  OnValueChange,
  InputAttributes,
  ChangeMeta,
} from './types';

export { numericFormatter, removeNumericFormat, getNumericCaretBoundary, useNumericFormat };
export { patternFormatter, removePatternFormat, getPatternCaretBoundary, usePatternFormat };
