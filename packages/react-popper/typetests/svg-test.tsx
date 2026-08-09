/** @jsxImportSource octane */
// Adapted one-for-one from packages/react-popper/upstream/tag/typings/tests/svg-test.tsx
import { Manager, Reference, Popper } from '@octanejs/react-popper';

export function Test() {
	return (
		<Manager>
			<svg>
				<Reference>
					{function referenceChild({ ref }) {
						return <g ref={ref} />;
					}}
				</Reference>
			</svg>
			<Popper placement="top" strategy="fixed" modifiers={[{ name: 'flip', enabled: false }]}>
				{function popperChild({
					ref,
					style,
					placement,
					isReferenceHidden,
					hasPopperEscaped,
					update,
					arrowProps,
				}) {
					return (
						<div
							ref={ref}
							style={{
								...style,
								opacity: isReferenceHidden || hasPopperEscaped ? 0 : 1,
							}}
							data-placement={placement}
							onClick={function onClick() {
								update();
							}}
						>
							Popper
							<div ref={arrowProps.ref} style={arrowProps.style} />
						</div>
					);
				}}
			</Popper>
			<Popper>
				{function simplePopper({ ref, style, placement }) {
					return (
						<div ref={ref} style={style} data-placement={placement}>
							Popper
						</div>
					);
				}}
			</Popper>
		</Manager>
	);
}
