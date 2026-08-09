import type { CSSTransitionProps, SwitchTransitionProps, TransitionProps } from '../src/types.ts';
import {
	CSSTransition,
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
expectType<typeof config>(config);

expectType<CSSTransitionProps['classNames']>(undefined);
expectType<SwitchTransitionProps['mode']>('out-in');
expectType<TransitionProps['timeout']>(0);
expectType<TransitionProps['appear']>(true);

// @ts-expect-error mode rejects arbitrary strings
const _badMode: SwitchTransitionProps['mode'] = 'sideways';
