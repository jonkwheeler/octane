// @vitest-environment node

import upstreamMakeAnimated, * as upstreamAnimated from 'react-select/animated';
import { renderToString } from 'octane/server';
import { describe, expect, it } from 'vitest';

import makeAnimated, * as animated from '../src/animated/index';
import {
	AnimatedInputFixture,
	CollapseFixture,
	FadeFixture,
	readCapturedInputProps,
} from './animated-fixture.tsrx';

describe('animated entry point parity', () => {
	it('matches the complete public export surface', () => {
		expect(Object.keys(animated).sort()).toEqual(Object.keys(upstreamAnimated).sort());
	});

	it('matches upstream memoization and custom-component precedence', () => {
		const customInput = () => null;
		const overrides = { Input: customInput } as never;
		const first = makeAnimated(overrides);
		const second = makeAnimated(overrides);
		const upstreamFirst = upstreamMakeAnimated(overrides);
		const upstreamSecond = upstreamMakeAnimated(overrides);

		expect(first).toBe(second);
		expect(upstreamFirst).toBe(upstreamSecond);
		expect(Object.keys(first).sort()).toEqual(Object.keys(upstreamFirst).sort());
		expect(first.Input).not.toBe(customInput);
	});

	it('strips transition-only props before forwarding Input props', () => {
		const result = renderToString(AnimatedInputFixture);
		expect(result.html).toContain('data-consumer="preserved"');
		expect(readCapturedInputProps()).toMatchObject({ consumer: 'preserved' });
		expect(readCapturedInputProps()).not.toHaveProperty('in');
		expect(readCapturedInputProps()).not.toHaveProperty('onExited');
		expect(readCapturedInputProps()).not.toHaveProperty('appear');
		expect(readCapturedInputProps()).not.toHaveProperty('enter');
		expect(readCapturedInputProps()).not.toHaveProperty('exit');
	});

	it('renders entered fade and collapse server states without leaking transition props', () => {
		const fade = renderToString(FadeFixture).html;
		const collapse = renderToString(CollapseFixture).html;
		expect(fade).toContain('opacity:1');
		expect(fade).toContain('transition:opacity 25ms');
		expect(fade).toContain('fade-consumer');
		expect(collapse).toContain('overflow:hidden');
		expect(collapse).toContain('white-space:nowrap');
		expect(collapse).toContain('collapse');
	});
});
