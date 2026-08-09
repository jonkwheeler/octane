import {
	CSSTransition,
	SwitchTransition,
	Transition,
	TransitionGroup,
	config,
	type CSSTransitionProps,
	type SwitchTransitionProps,
	type TransitionGroupProps,
	type TransitionProps,
	type TransitionStatus,
} from '../src/index';

declare const transitionProps: TransitionProps;
declare const cssProps: CSSTransitionProps;
declare const groupProps: TransitionGroupProps;
declare const switchProps: SwitchTransitionProps;
declare const status: TransitionStatus;
declare const transitionComponent: typeof Transition;
declare const cssComponent: typeof CSSTransition;
declare const groupComponent: typeof TransitionGroup;
declare const switchComponent: typeof SwitchTransition;

void transitionProps;
void cssProps;
void groupProps;
void switchProps;
void status;
void transitionComponent;
void cssComponent;
void groupComponent;
void switchComponent;

config.disabled = false;

const fade: CSSTransitionProps = {
	in: true,
	timeout: 300,
	classNames: 'fade',
	children: null,
};
void fade;

const namedClasses: CSSTransitionProps = {
	in: false,
	timeout: { appear: 100, enter: 200, exit: 300 },
	classNames: {
		appear: 'fade-appear',
		appearActive: 'fade-appear-active',
		enter: 'fade-enter',
		enterActive: 'fade-enter-active',
		exit: 'fade-exit',
		exitActive: 'fade-exit-active',
	},
	children: null,
};
void namedClasses;

const statuses: TransitionStatus[] = ['unmounted', 'exited', 'entering', 'entered', 'exiting'];
void statuses;

const group: TransitionGroupProps = {
	appear: true,
	enter: true,
	exit: true,
	component: 'div',
};
void group;

const mode: SwitchTransitionProps['mode'] = 'out-in';
void mode;

// @ts-expect-error invalid transition status stays rejected
const invalidStatus: TransitionStatus = 'done';
void invalidStatus;
