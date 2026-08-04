import React from 'react';
// @parity-case types:react-popper-pristine
import {
	Manager,
	Popper,
	Reference,
	usePopper,
	type Modifier,
	type PopperChildrenProps,
	type StrictModifier,
} from '../upstream/npm/typings/react-popper';

const custom: Modifier<'custom', { enabled: boolean }> = {
	name: 'custom',
	enabled: true,
	options: { enabled: true },
};
const offset: StrictModifier<'offset'> = { name: 'offset', options: { offset: [0, 8] } };
void custom;
void offset;

function Hook(props: { reference: Element | null; popper: HTMLElement | null }) {
	const result = usePopper(props.reference, props.popper, {
		placement: 'top-start',
		strategy: 'fixed',
		modifiers: [offset, custom],
	});
	return <output>{result.state?.placement}</output>;
}
void Hook;

void (
	<Manager>
		<Reference>{({ ref }) => <button ref={ref}>reference</button>}</Reference>
		<Popper placement="bottom" modifiers={[offset, custom]}>
			{({ ref, style, placement, arrowProps, update }: PopperChildrenProps) => (
				<div ref={ref} style={style} data-placement={placement}>
					<div ref={arrowProps.ref} style={arrowProps.style} />
					<button onClick={() => update()}>update</button>
				</div>
			)}
		</Popper>
	</Manager>
);
