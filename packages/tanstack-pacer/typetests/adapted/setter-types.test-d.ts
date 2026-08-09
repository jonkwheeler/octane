// OCTANE DIVERGENCE[structural-state-setter-types][types:adapted-setters]
// Upstream spells setters as React.Dispatch<React.SetStateAction<T>>.
// Octane exports structurally identical local Dispatch/SetStateAction aliases.
import { useDebouncedState, useThrottledState } from '@octanejs/tanstack-pacer';
import type { Dispatch, SetStateAction } from '../../src/internal';

type NumberSetter = Dispatch<SetStateAction<number>>;

function acceptsNumberSetter(setter: NumberSetter): void {
	setter(1);
	setter(function (prev: number) {
		return prev + 1;
	});
}

declare const debounced: ReturnType<typeof useDebouncedState<number>>;
declare const throttled: ReturnType<typeof useThrottledState<number>>;

acceptsNumberSetter(debounced[1] as unknown as NumberSetter);
acceptsNumberSetter(throttled[1] as unknown as NumberSetter);

// Local aliases must remain structurally assignable to the React spelling when present.
type ReactLikeSetter = (value: number | ((prev: number) => number)) => void;
const localSetter: NumberSetter = function (value) {
	void value;
};
const reactLike: ReactLikeSetter = localSetter;
void reactLike;

// Reject a setter that cannot accept the callback form.
// @ts-expect-error callback updater required by SetStateAction
const badSetter: NumberSetter = function (value: number) {
	void value;
};
void badSetter;
