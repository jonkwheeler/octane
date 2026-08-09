import { describe, expect, it } from 'vitest';
import * as ReactTransitionGroup from '../../src/index.ts';

describe('SSR', function ssrSuite() {
	it('should import react-transition-group in node env', function importPackage() {
		expect(ReactTransitionGroup.Transition).toBeTypeOf('function');
		expect(ReactTransitionGroup.CSSTransition).toBeTypeOf('function');
		expect(ReactTransitionGroup.TransitionGroup).toBeTypeOf('function');
	});
});
