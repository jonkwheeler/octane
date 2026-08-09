import { expect, it } from 'vitest';
import { processSync } from '../src/processor';

it.each([
	[null, ''],
	[undefined, ''],
])('accepts pinned empty child %j', (children, expected) => {
	expect(processSync({ children }).children).toEqual(expected ? expect.anything() : []);
});

it('rejects non-string children with the pinned message', () => {
	expect(() => processSync({ children: 123 as never })).toThrow(
		'Unexpected value `123` for `children` prop, expected `string`',
	);
});

it('rejects boolean true children with the exact pinned diagnostic', () => {
	expect(() => processSync({ children: true as never })).toThrow(
		'Unexpected value `true` for `children` prop, expected `string`',
	);
});

it('rejects combined element lists with the pinned message', () => {
	expect(() => processSync({ children: 'x', allowedElements: [], disallowedElements: [] })).toThrow(
		'Unexpected combined `allowedElements` and `disallowedElements`, expected one or the other',
	);
});

it.each([
	['allowDangerousHtml', undefined, 'remove it'],
	['source', 'children', 'use `children` instead'],
])('rejects removed prop %s', (from, _to, action) => {
	expect(() => processSync({ children: '', [from]: true } as never)).toThrow(
		`Unexpected \`${from}\` prop, ${action}`,
	);
});
