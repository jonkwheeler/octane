import type { TransitionProps } from 'react-transition-group/Transition';
import type { SwitchTransitionProps } from 'react-transition-group/SwitchTransition';
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

expectType<TransitionProps['timeout']>(0);
expectType<SwitchTransitionProps['mode']>('out-in');
expectType<TransitionProps['appear']>(true);
