// Adapted compile accept evidence: the Octane adapter public surface typechecks
// through tsrx-tsc. One-for-one with upstream's test:types (tsc over package source).
import {
	PacerProvider,
	useBatcher,
	useDebouncedCallback,
	useDebouncedState,
	usePacerContext,
	useThrottledCallback,
	useThrottler,
} from '@octanejs/tanstack-pacer';
import type { ReactDebouncer, ReactThrottler } from '@octanejs/tanstack-pacer';

void PacerProvider;
void usePacerContext;
void useBatcher;
void useDebouncedCallback;
void useDebouncedState;
void useThrottledCallback;
void useThrottler;

type _Debouncer = ReactDebouncer<() => void>;
type _Throttler = ReactThrottler<() => void>;
type _Ok = [_Debouncer, _Throttler];
type _Assert = _Ok extends [unknown, unknown] ? true : never;
const ok: _Assert = true;
void ok;
