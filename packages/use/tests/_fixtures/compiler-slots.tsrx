import { useAsync, useAsyncFn, useEvent, useKey, useObservable } from '../../src/index.js';

const observable = {
	subscribe() {
		return { unsubscribe() {} };
	},
};

export function CompilerSlotDefaultsFixture(props: { onEvent: () => void }) @{
	useKey('Enter', () => {});
	useEvent('slot-safe-event', props.onEvent);
	const [asyncState] = useAsyncFn(() => Promise.resolve(), []);
	useAsync(() => new Promise(() => {}));
	const observableValue = useObservable(observable);

	<span data-async-state={typeof asyncState} data-observable={typeof observableValue}>
		slot-safe
	</span>
}
