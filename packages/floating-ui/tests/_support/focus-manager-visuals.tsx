/** @jsxImportSource octane */
import {
	FloatingFocusManager,
	FloatingNode,
	FloatingPortal,
	FloatingTree,
	safePolygon,
	useClick,
	useDismiss,
	useFloating,
	useFloatingNodeId,
	useFocus,
	useHover,
	useInteractions,
	useRole,
} from '../../src';
import { createContext, useContext, useState } from 'octane';

export const ResponsiveContext = createContext({ width: 1600 });

export function Drawer() {
	const [open, setOpen] = useState(false);
	const { width } = useContext(ResponsiveContext);
	const modal = width < 1400;
	const { refs, context } = useFloating({ open, onOpenChange: setOpen });
	const { getReferenceProps, getFloatingProps } = useInteractions([
		useClick(context),
		useRole(context),
		useDismiss(context, {
			outsidePress: modal,
			outsidePressEvent: 'mousedown',
		}),
	]);

	return (
		<div>
			<button ref={refs.setReference} {...getReferenceProps()}>
				My button
			</button>
			<div id="drawer-root" />
			<FloatingPortal id="drawer-root">
				{open ? (
					<FloatingFocusManager context={context} modal={modal} closeOnFocusOut={modal}>
						<div ref={refs.setFloating} {...getFloatingProps()}>
							<button onClick={() => setOpen(false)}>Close</button>
						</div>
					</FloatingFocusManager>
				) : null}
			</FloatingPortal>
			<button>Next button</button>
		</div>
	);
}

function NavigationProduct() {
	const [open, setOpen] = useState(false);
	const nodeId = useFloatingNodeId();
	const { refs, context } = useFloating({
		nodeId,
		open,
		onOpenChange: setOpen,
	});
	const { getReferenceProps, getFloatingProps } = useInteractions([
		useHover(context, { handleClose: safePolygon() }),
		useFocus(context),
		useDismiss(context),
	]);

	return (
		<FloatingNode id={nodeId}>
			<a href="#" ref={refs.setReference} {...getReferenceProps()}>
				Product
			</a>
			<FloatingPortal>
				{open ? (
					<FloatingFocusManager context={context} modal={false} initialFocus={-1}>
						<div data-testid="subnavigation" ref={refs.setFloating} {...getFloatingProps()}>
							<button type="button" onClick={() => setOpen(false)}>
								Close
							</button>
							<a href="#">Link 1</a>
						</div>
					</FloatingFocusManager>
				) : null}
			</FloatingPortal>
		</FloatingNode>
	);
}

export function Navigation() {
	return (
		<FloatingTree>
			<nav>
				<NavigationProduct />
			</nav>
		</FloatingTree>
	);
}

export function MenuVirtual() {
	return <input role="combobox" aria-autocomplete="list" />;
}
