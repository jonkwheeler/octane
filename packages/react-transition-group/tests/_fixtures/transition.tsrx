import { cloneElement, useRef, useState, type ElementDescriptor } from 'octane';
import {
	CSSTransition,
	ReplaceTransition,
	SwitchTransition,
	Transition,
	TransitionGroup,
} from '../../src/index.ts';

export function TransitionFixture(props: { trace: string[] }) @{
	const [shown, setShown] = useState(false);
	<main>
		<button id="toggle" onClick={() => setShown((value) => !value)}>{'toggle'}</button>
		<Transition
			in={shown}
			timeout={20}
			onEnter={() => props.trace.push('enter')}
			onEntering={() => props.trace.push('entering')}
			onEntered={() => props.trace.push('entered')}
			onExit={() => props.trace.push('exit')}
			onExiting={() => props.trace.push('exiting')}
			onExited={() => props.trace.push('exited')}
		>
			{(status) => <span id="state" data-state={status}>{status}</span>}
		</Transition>
	</main>
}

export function CSSFixture() @{
	const [shown, setShown] = useState(false);
	const nodeRef = useRef<HTMLDivElement | null>(null);
	<main>
		<button id="css-toggle" onClick={() => setShown((value) => !value)}>{'toggle'}</button>
		<CSSTransition nodeRef={nodeRef} in={shown} timeout={20} classNames="fade">
			<div id="css-node" ref={nodeRef}>{'content'}</div>
		</CSSTransition>
	</main>
}

export function GroupFixture(props: { trace: string[] }) @{
	const [items, setItems] = useState(['one', 'two']);
	<main>
		<button id="remove-first" onClick={() => setItems(['two'])}>{'remove'}</button>
		<TransitionGroup
			component="section"
			id="group"
			children={items.map(
				(id) => <Transition key={id} timeout={20} onExited={() => props.trace.push(`exited:${id}`)}>
					{(status) => <span data-item={id} data-state={status}>{id}</span>}
				</Transition>,
			)}
		/>
	</main>
}

export function ClonedTransitionFixture(props: { trace: string[] }) @{
	const [shown, setShown] = useState(true);
	const original = useRef<ElementDescriptor | null>(null);
	if (original.current === null) {
		original.current = <Transition
			key="stable"
			timeout={20}
			onExited={() => props.trace.push('exited')}
		>
			{(status) => <span id="cloned-state">{status}</span>}
		</Transition>;
	}
	const child = cloneElement(original.current, { in: shown });
	<main>
		<button id="clone-toggle" onClick={() => setShown(false)}>{'hide'}</button>
		{child}
	</main>
}

export function NodeRefAppearFixture(props: { calls: unknown[][] }) @{
	const nodeRef = useRef<HTMLDivElement | null>(null);
	<Transition
		in
		appear
		nodeRef={nodeRef}
		timeout={20}
		onEnter={((...args: unknown[]) => props.calls.push(args)) as any}
	>
		<div id="appear-node" ref={nodeRef}>{'appear'}</div>
	</Transition>
}

export function MountOnEnterFixture() @{
	const [shown, setShown] = useState(false);
	const nodeRef = useRef<HTMLDivElement | null>(null);
	<main>
		<button id="mount-toggle" onClick={() => setShown(true)}>{'show'}</button>
		<CSSTransition nodeRef={nodeRef} in={shown} mountOnEnter timeout={20} classNames="mount">
			<div id="mounted-node" ref={nodeRef}>{'mounted'}</div>
		</CSSTransition>
	</main>
}

export function SameKeyGroupFixture() @{
	const [label, setLabel] = useState('first');
	const child = <Transition key="stable" timeout={0}>
		<span id="same-key-label">{label}</span>
	</Transition>;
	<main>
		<button id="same-key-update" onClick={() => setLabel('second')}>{'update'}</button>
		<TransitionGroup children={[child]} />
	</main>
}

export function SwitchFixture(props: { mode: 'out-in' | 'in-out' }) @{
	const [second, setSecond] = useState(false);
	const id = second ? 'second' : 'first';
	const child = <Transition key={id} timeout={20}>
		{(status) => <span data-switch={id} data-state={status}>{id}</span>}
	</Transition>;
	<main>
		<button id="switch-toggle" onClick={() => setSecond(true)}>{'switch'}</button>
		<SwitchTransition mode={props.mode} children={child} />
	</main>
}

export function ReplaceFixture() @{
	const [first, setFirst] = useState(true);
	const children = [
		<Transition key="first" timeout={20}>
			<span data-replace="first">{'first'}</span>
		</Transition>,
		<Transition key="second" timeout={20}>
			<span data-replace="second">{'second'}</span>
		</Transition>,
	];
	<main>
		<button id="replace-toggle" onClick={() => setFirst(false)}>{'replace'}</button>
		<ReplaceTransition in={first} children={children} />
	</main>
}
