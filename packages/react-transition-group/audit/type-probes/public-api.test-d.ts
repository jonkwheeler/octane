import type { ReactNode } from 'react';
import type { CSSTransitionProps } from 'react-transition-group/CSSTransition';
import type { SwitchTransitionProps } from 'react-transition-group/SwitchTransition';
import type { TransitionGroupProps } from 'react-transition-group/TransitionGroup';
import type { TransitionProps, TransitionStatus } from 'react-transition-group/Transition';
import {
	CSSTransition,
	SwitchTransition,
	Transition,
	TransitionGroup,
	config,
} from 'react-transition-group';

declare function expectType<T>(value: T): void;

expectType<typeof Transition>(Transition);
expectType<typeof CSSTransition>(CSSTransition);
expectType<typeof TransitionGroup>(TransitionGroup);
expectType<typeof SwitchTransition>(SwitchTransition);
expectType<typeof config>(config);

type TransitionChildren = TransitionProps['children'];
expectType<
	ReactNode | ((status: TransitionStatus, childProps: Record<string, unknown>) => ReactNode)
>(null as unknown as TransitionChildren);

type GroupChildren = TransitionGroupProps['children'];
expectType<ReactNode | undefined>(null as unknown as GroupChildren);

expectType<CSSTransitionProps['classNames']>(undefined);
expectType<SwitchTransitionProps['mode']>('out-in');
expectType<TransitionProps['timeout']>(0);
expectType<TransitionProps['appear']>(true);

// @ts-expect-error mode rejects arbitrary strings
const _badMode: SwitchTransitionProps['mode'] = 'sideways';
