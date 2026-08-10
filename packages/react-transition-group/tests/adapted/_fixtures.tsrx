import {
	cloneElement,
	useLayoutEffect,
	useRef,
	useState,
	type ElementDescriptor,
	type OctaneNode,
} from 'octane';
import {
	CSSTransition,
	SwitchTransition,
	Transition,
	TransitionGroup,
	type CSSClassNames,
	type TransitionTimeout,
} from '../../src/index.ts';

export interface TransitionHarnessProps {
	trace: string[];
	initial?: boolean;
	appear?: boolean;
	mountOnEnter?: boolean;
	unmountOnExit?: boolean;
	enter?: boolean;
	exit?: boolean;
	timeout?: TransitionTimeout;
	addEndListener?: (done: () => void) => void;
}

export function TransitionHarness(props: TransitionHarnessProps) @{
	const [shown, setShown] = useState(props.initial === true);
	const nodeRef = useRef<HTMLDivElement | null>(null);
	const timeout = Object.prototype.hasOwnProperty.call(props, 'timeout') ? props.timeout : 10;
	function toggle() {
		setShown(function invert(value) {
			return !value;
		});
	}
	function record(name: string) {
		props.trace.push(name);
	}
	function onEnter(nodeOrAppearing?: Element | boolean, isAppearing?: boolean) {
		const appearing =
			typeof nodeOrAppearing === 'boolean' ? nodeOrAppearing : isAppearing;
		record(appearing ? 'appear' : 'enter');
	}
	function onEntering(nodeOrAppearing?: Element | boolean, isAppearing?: boolean) {
		const appearing =
			typeof nodeOrAppearing === 'boolean' ? nodeOrAppearing : isAppearing;
		record(appearing ? 'appearing' : 'entering');
	}
	function onEntered(nodeOrAppearing?: Element | boolean, isAppearing?: boolean) {
		const appearing =
			typeof nodeOrAppearing === 'boolean' ? nodeOrAppearing : isAppearing;
		record(appearing ? 'appeared' : 'entered');
	}
	function onExit() {
		record('exit');
	}
	function onExiting() {
		record('exiting');
	}
	function onExited() {
		record('exited');
	}
	function child(status: string, childProps: Record<string, unknown>) {
		return <div id="transition-node" ref={nodeRef} data-status={status} {...childProps}>
			{'status: ' + status}
		</div>;
	}
	<main>
		<button id="transition-toggle" onClick={toggle}>{'toggle'}</button>
		<Transition
			in={shown}
			appear={props.appear}
			mountOnEnter={props.mountOnEnter}
			unmountOnExit={props.unmountOnExit}
			enter={props.enter}
			exit={props.exit}
			timeout={timeout}
			addEndListener={props.addEndListener}
			nodeRef={nodeRef}
			onEnter={onEnter}
			onEntering={onEntering}
			onEntered={onEntered}
			onExit={onExit}
			onExiting={onExiting}
			onExited={onExited}
			foo="foo"
			bar="bar"
			children={child}
		/>
	</main>
}

export interface CSSHarnessProps {
	trace: string[];
	initial?: boolean;
	appear?: boolean;
	classNames?: CSSClassNames;
	extraClass?: string;
}

export function CSSHarness(props: CSSHarnessProps) @{
	const [shown, setShown] = useState(props.initial === true);
	const nodeRef = useRef<HTMLDivElement | null>(null);
	function toggle() {
		setShown(function invert(value) {
			return !value;
		});
	}
	function record(name: string, appearing?: boolean) {
		props.trace.push(appearing ? name + ':appear' : name);
	}
	function onEnter(nodeOrAppearing?: Element | boolean, isAppearing?: boolean) {
		const appearing =
			typeof nodeOrAppearing === 'boolean' ? nodeOrAppearing : isAppearing;
		record('enter', appearing);
	}
	function onEntering(nodeOrAppearing?: Element | boolean, isAppearing?: boolean) {
		const appearing =
			typeof nodeOrAppearing === 'boolean' ? nodeOrAppearing : isAppearing;
		record('entering', appearing);
	}
	function onEntered(nodeOrAppearing?: Element | boolean, isAppearing?: boolean) {
		const appearing =
			typeof nodeOrAppearing === 'boolean' ? nodeOrAppearing : isAppearing;
		record('entered', appearing);
	}
	function onExit() {
		record('exit');
	}
	function onExiting() {
		record('exiting');
	}
	function onExited() {
		record('exited');
	}
	<main>
		<button id="css-toggle-adapted" onClick={toggle}>{'toggle'}</button>
		<CSSTransition
			in={shown}
			appear={props.appear}
			nodeRef={nodeRef}
			timeout={10}
			classNames={props.classNames ?? 'test'}
			onEnter={onEnter}
			onEntering={onEntering}
			onEntered={onEntered}
			onExit={onExit}
			onExiting={onExiting}
			onExited={onExited}
		>
			<div id="css-node-adapted" ref={nodeRef} class={props.extraClass ?? ''}>{'css'}</div>
		</CSSTransition>
	</main>
}

export interface GroupHarnessProps {
	trace: string[];
	initialItems?: string[];
	initialExit?: boolean;
	enter?: boolean;
	appear?: boolean;
}

export function GroupHarness(props: GroupHarnessProps) @{
	const [items, setItems] = useState(props.initialItems ?? ['one']);
	const [exitEnabled, setExitEnabled] = useState(props.initialExit ?? true);
	function replace() {
		setItems(function nextItem(current) {
			return current[0] === 'one' ? ['two'] : ['three'];
		});
	}
	function add() {
		setItems(['one', 'two']);
	}
	function showOne() {
		setItems(['one']);
	}
	function clear() {
		setItems([]);
	}
	function enableExit() {
		setExitEnabled(true);
	}
	const children: ElementDescriptor[] = [];
	for (const id of items) {
		const nodeRef = { current: null } as { current: HTMLSpanElement | null };
		function onEnter(nodeOrAppearing?: Element | boolean, isAppearing?: boolean) {
			const appearing =
				typeof nodeOrAppearing === 'boolean' ? nodeOrAppearing : isAppearing;
			props.trace.push((appearing ? 'appear:' : 'enter:') + id);
		}
		function onEntering(nodeOrAppearing?: Element | boolean, isAppearing?: boolean) {
			const appearing =
				typeof nodeOrAppearing === 'boolean' ? nodeOrAppearing : isAppearing;
			props.trace.push((appearing ? 'appearing:' : 'entering:') + id);
		}
		function onEntered(nodeOrAppearing?: Element | boolean, isAppearing?: boolean) {
			const appearing =
				typeof nodeOrAppearing === 'boolean' ? nodeOrAppearing : isAppearing;
			props.trace.push((appearing ? 'appeared:' : 'entered:') + id);
		}
		function exiting() {
			props.trace.push('exiting:' + id);
		}
		function exit() {
			props.trace.push('exit:' + id);
		}
		function exited() {
			props.trace.push('exited:' + id);
		}
		children.push(
			<CSSTransition
				key={id}
				nodeRef={nodeRef}
				timeout={10}
				classNames="yolo"
				onEnter={onEnter}
				onEntering={onEntering}
				onEntered={onEntered}
				onExit={exit}
				onExiting={exiting}
				onExited={exited}
			>
				<span ref={nodeRef} data-group-item={id}>{id}</span>
			</CSSTransition>,
		);
	}
	<main>
		<button id="group-replace" onClick={replace}>{'replace'}</button>
		<button id="group-add" onClick={add}>{'add'}</button>
		<button id="group-one" onClick={showOne}>{'one'}</button>
		<button id="group-clear" onClick={clear}>{'clear'}</button>
		<button id="group-enable-exit" onClick={enableExit}>{'enable exit'}</button>
		<TransitionGroup
			appear={props.appear}
			enter={props.enter}
			exit={exitEnabled}
			children={children}
		/>
	</main>
}

function NullChild() {
	return null;
}

function AppearToggleChild(props: { show: boolean }) {
	if (!props.show) return null;
	return <div data-unmounted-appear={'yes'} />;
}

export function NullRenderingGroupHarness(props: { trace: string[] }) @{
	const [shown, setShown] = useState(false);
	function show() {
		setShown(true);
	}
	function hide() {
		setShown(false);
	}
	function entered() {
		props.trace.push('entered');
	}
	function exited() {
		props.trace.push('exited');
	}
	const children: ElementDescriptor[] = [];
	if (shown) {
		children.push(
			<CSSTransition key="null" classNames="yolo" timeout={0} onEntered={entered} onExited={exited}>
				<NullChild />
			</CSSTransition>,
		);
	}
	<main>
		<button id="null-group-show" onClick={show}>{'show'}</button>
		<button id="null-group-hide" onClick={hide}>{'hide'}</button>
		<TransitionGroup children={children} />
	</main>
}

export interface ReenterFactoryHarnessProps {
	direction: string;
	text: string;
	onEnter?: (className: string) => void;
	onEntering?: (className: string) => void;
	onEntered?: (className: string) => void;
}

export function ReenterFactoryHarness(props: ReenterFactoryHarnessProps) @{
	const fooRef = useRef<HTMLSpanElement | null>(null);
	const barRef = useRef<HTMLSpanElement | null>(null);
	const nodeRef = props.text === 'bar' ? barRef : fooRef;
	function childFactory(child: ElementDescriptor) {
		return cloneElement(child, { classNames: props.direction });
	}
	function onEnter() {
		props.onEnter?.(nodeRef.current?.className ?? '');
	}
	function onEntering() {
		props.onEntering?.(nodeRef.current?.className ?? '');
	}
	function onEntered() {
		props.onEntered?.(nodeRef.current?.className ?? '');
	}
	const child = (
		<CSSTransition
			key={props.text}
			timeout={10}
			classNames={props.direction}
			nodeRef={nodeRef}
			onEnter={onEnter}
			onEntering={onEntering}
			onEntered={onEntered}
		>
			<span ref={nodeRef} data-reenter={props.text}>{props.text as string}</span>
		</CSSTransition>
	);
	<main data-reenter-root="">
		<TransitionGroup component={null} childFactory={childFactory} children={[child]} />
	</main>
}

/**
 * Upstream "should handle unmounted elements properly": TransitionGroup stays
 * mounted with appear while a child flips from a DOM node to null mid-lifecycle.
 */
export function UnmountedAppearHarness() @{
	const [showChild, setShowChild] = useState(true);
	useLayoutEffect(function hideOnMount() {
		setShowChild(false);
	}, []);
	const nodeRef = useRef<HTMLDivElement | null>(null);
	const child = (
		<CSSTransition key="child" appear timeout={10} classNames="yolo" nodeRef={nodeRef}>
			<AppearToggleChild show={showChild} />
		</CSSTransition>
	);
	<main>
		<TransitionGroup appear={true} children={[child]} />
	</main>
}

function FirstChild(props: { children?: OctaneNode }) {
	const children = Array.isArray(props.children) ? props.children : [props.children];
	return children[0] ?? null;
}

export function GroupShapeHarness(props: { callbackRef: { current: Element | null } }) @{
	function callback(node: Element | null) {
		props.callbackRef.current = node;
	}
	const child = <Transition key="shape" timeout={0}>
		<span ref={callback}>{'shape'}</span>
	</Transition>;
	<main>
		<TransitionGroup component={FirstChild} children={[child]} />
		<TransitionGroup children={null} />
	</main>
}

export function SwitchNullableHarness(props: {
	trace: string[];
	initial?: 'none' | 'first' | 'second';
}) @{
	const [mode, setMode] = useState<'none' | 'first' | 'second'>(props.initial ?? 'none');
	function first() {
		setMode('first');
	}
	function second() {
		setMode('second');
	}
	let child: ElementDescriptor | null = null;
	if (mode !== 'none') {
		const id = mode;
		function onEnter(nodeOrAppearing?: Element | boolean, isAppearing?: boolean) {
			const appearing =
				typeof nodeOrAppearing === 'boolean' ? nodeOrAppearing : isAppearing;
			props.trace.push((appearing ? 'appear:' : 'enter:') + id);
		}
		function onEntering(nodeOrAppearing?: Element | boolean, isAppearing?: boolean) {
			const appearing =
				typeof nodeOrAppearing === 'boolean' ? nodeOrAppearing : isAppearing;
			props.trace.push((appearing ? 'appearing:' : 'entering:') + id);
		}
		function onEntered(nodeOrAppearing?: Element | boolean, isAppearing?: boolean) {
			const appearing =
				typeof nodeOrAppearing === 'boolean' ? nodeOrAppearing : isAppearing;
			props.trace.push((appearing ? 'appeared:' : 'entered:') + id);
		}
		function onExit() {
			props.trace.push('exit:' + id);
		}
		function onExiting() {
			props.trace.push('exiting:' + id);
		}
		function onExited() {
			props.trace.push('exited:' + id);
		}
		function renderChild(status: string) {
			return <span data-nullable-switch={id} data-state={status}>{id}</span>;
		}
		child = <Transition
			key={id}
			timeout={10}
			onEnter={onEnter}
			onEntering={onEntering}
			onEntered={onEntered}
			onExit={onExit}
			onExiting={onExiting}
			onExited={onExited}
			children={renderChild}
		/>;
	}
	<main>
		<button id="switch-first" onClick={first}>{'first'}</button>
		<button id="switch-second" onClick={second}>{'second'}</button>
		<SwitchTransition children={child} />
	</main>
}

export function CustomWrapper(props: { children?: OctaneNode }) @{
	const children: OctaneNode[] = [];
	const source = Array.isArray(props.children) ? props.children : [props.children];
	for (const child of source) {
		if (child && typeof child === 'object') {
			children.push(cloneElement(child as ElementDescriptor, { class: 'wrapper-item' }));
		}
	}
	<div id="custom-wrapper">{children}</div>
}

export function CustomWrapperHarness() @{
	const child = <Transition key="wrapped" timeout={0}>
		<span>{'wrapped'}</span>
	</Transition>;
	<TransitionGroup component={CustomWrapper} children={[child]} />
}

export function mappingChildren() {
	return [
		<div key="one">
			<span>{'nested'}</span>
		</div>,
		<div key="two">{'foo'}</div>,
	];
}
