import '@testing-library/jest-dom/vitest';
import { cleanup } from '@octanejs/testing-library';
import { afterEach, beforeEach } from 'vitest';

import { mockResizeObserver } from '../src/utils/test/mockResizeObserver';
import { mockScrollTo } from '../src/utils/test/mockScrollTo';

let unmockResizeObserver: (() => void) | null = null;
let unmockScrollTo: (() => void) | null = null;

beforeEach(() => {
	unmockResizeObserver = mockResizeObserver();
	unmockScrollTo = mockScrollTo();
});

afterEach(() => {
	cleanup();
	unmockResizeObserver?.();
	unmockScrollTo?.();
});
