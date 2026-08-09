import { cloneElement, useRef, useState, type ElementDescriptor, type OctaneNode } from 'octane';
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
			timeout={props.timeout ?? 10}
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

export function GroupHarness(props: { trace: string[] }) @{
	const [items, setItems] = useState(['one']);
	function replace() {
		setItems(['two']);
	}
	function add() {
		setItems(['one', 'two']);
	}
	function clear() {
		setItems([]);
	}
	const children: ElementDescriptor[] = [];
	for (const id of items) {
		const nodeRef = { current: null } as { current: HTMLSpanElement | null };
		function exited() {
			props.trace.push('exited:' + id);
		}
		children.push(
			<CSSTransition key={id} nodeRef={nodeRef} timeout={10} classNames="yolo" onExited={exited}>
				<span ref={nodeRef} data-group-item={id}>{id}</span>
			</CSSTransition>,
		);
	}
	<main>
		<button id="group-replace" onClick={replace}>{'replace'}</button>
		<button id="group-add" onClick={add}>{'add'}</button>
		<button id="group-clear" onClick={clear}>{'clear'}</button>
		<TransitionGroup children={children} />
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
		function entered() {
			props.trace.push('entered:' + id);
		}
		function exited() {
			props.trace.push('exited:' + id);
		}
		function renderChild(status: string) {
			return <span data-nullable-switch={id} data-state={status}>{id}</span>;
		}
		child = <Transition
			key={id}
			timeout={10}
			onEntered={entered}
			onExited={exited}
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
