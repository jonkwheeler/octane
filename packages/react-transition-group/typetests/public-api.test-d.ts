import type { OctaneNode } from 'octane';
import type {
	CSSTransitionProps,
	SwitchTransitionProps,
	TransitionGroupProps,
	TransitionProps,
	TransitionStatus,
} from '../src/types.ts';
import {
	CSSTransition,
	ReplaceTransition,
	SwitchTransition,
	Transition,
	TransitionGroup,
	config,
} from '../src/index.ts';

declare function expectType<T>(value: T): void;

expectType<typeof Transition>(Transition);
expectType<typeof CSSTransition>(CSSTransition);
expectType<typeof TransitionGroup>(TransitionGroup);
expectType<typeof SwitchTransition>(SwitchTransition);
expectType<typeof ReplaceTransition>(ReplaceTransition);
expectType<typeof config>(config);

type TransitionChildren = TransitionProps['children'];
expectType<
	OctaneNode | ((status: TransitionStatus, childProps: Record<string, unknown>) => OctaneNode)
>(null as unknown as TransitionChildren);

type GroupChildren = TransitionGroupProps['children'];
expectType<OctaneNode | undefined>(null as unknown as GroupChildren);

expectType<CSSTransitionProps['classNames']>(undefined);
expectType<SwitchTransitionProps['mode']>('out-in');
expectType<TransitionProps['timeout']>(0);
