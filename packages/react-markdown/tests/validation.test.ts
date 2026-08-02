import { expect, it } from 'vitest';
import { processSync } from '../src/processor';

it.each([
	[null, ''],
	[undefined, ''],
	['', ''],
])('accepts pinned empty child %j', (children, expected) => {
	expect(processSync({ children }).children).toEqual(expected ? expect.anything() : []);
});

it('rejects non-string children with the pinned message', () => {
	expect(() => processSync({ children: 123 as never })).toThrow(
		'Unexpected value `123` for `children` prop, expected `string`',
	);
});

it('rejects combined element lists with the pinned message', () => {
	expect(() => processSync({ children: 'x', allowedElements: [], disallowedElements: [] })).toThrow(
		'Unexpected combined `allowedElements` and `disallowedElements`, expected one or the other',
	);
});

it.each([
	['astPlugins', undefined, 'remove it'],
	['allowDangerousHtml', undefined, 'remove it'],
	['allowNode', 'allowElement', 'use `allowElement` instead'],
	['allowedTypes', 'allowedElements', 'use `allowedElements` instead'],
	['className', undefined, 'remove it'],
	['disallowedTypes', 'disallowedElements', 'use `disallowedElements` instead'],
	['escapeHtml', undefined, 'remove it'],
	['includeElementIndex', undefined, 'remove it'],
	['includeNodeIndex', undefined, 'remove it'],
	['linkTarget', undefined, 'remove it'],
	['plugins', 'remarkPlugins', 'use `remarkPlugins` instead'],
	['rawSourcePos', undefined, 'remove it'],
	['renderers', 'components', 'use `components` instead'],
	['source', 'children', 'use `children` instead'],
	['sourcePos', undefined, 'remove it'],
	['transformImageUri', 'urlTransform', 'use `urlTransform` instead'],
	['transformLinkUri', 'urlTransform', 'use `urlTransform` instead'],
])('rejects removed prop %s', (from, _to, action) => {
	expect(() => processSync({ children: '', [from]: true } as never)).toThrow(
		`Unexpected \`${from}\` prop, ${action}`,
	);
});
