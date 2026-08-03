import type { Element, Root } from 'hast';
import { markChildrenBlock } from 'octane';
import { expect, it } from 'vitest';
import { createFile, processAsync, processSync, transformTree } from '../../src/processor';

it('rejects a compiled children block without invoking it', () => {
	let calls = 0;
	const children = markChildrenBlock(() => {
		calls += 1;
		return '# invoked';
	});

	expect(() => createFile({ children: children as unknown as string })).toThrowError(
		/value-position JSX.*explicit `children` prop/,
	);
	expect(calls).toBe(0);
});

it('keeps plugin order and merges allowDangerousHtml last', async () => {
	const calls: string[] = [];
	const plugin = (name: string) => () => (tree: Root) => {
		calls.push(name);
		tree.children.push({ type: 'text', value: name });
	};

	const tree = await processAsync({
		children: '<i>x</i>',
		remarkPlugins: [plugin('remark')],
		rehypePlugins: [plugin('rehype')],
		remarkRehypeOptions: { allowDangerousHtml: false },
	});

	expect(calls).toEqual(['remark', 'rehype']);
	expect(JSON.stringify(tree)).toContain('"value":"<i>"');
	expect(JSON.stringify(tree)).toContain('"value":"</i>"');
});

it('matches pinned raw handling and filtering order', () => {
	const tree = processSync({
		children: '<b>raw</b>\n\n[unsafe](javascript:alert(1))',
		disallowedElements: ['p'],
		unwrapDisallowed: true,
	});
	expect(tree.children.map((node) => node.type)).toEqual([
		'text',
		'text',
		'text',
		'text',
		'element',
	]);
	expect(tree.children[0]).toEqual({ type: 'text', value: '<b>' });
	expect(tree.children[2]).toEqual({ type: 'text', value: '</b>' });
	expect(tree.children[4]).toMatchObject({
		type: 'element',
		tagName: 'a',
		properties: { href: '' },
	});

	expect(processSync({ children: '<b>raw</b>', skipHtml: true })).toMatchObject({
		children: [
			{
				type: 'element',
				tagName: 'p',
				children: [{ type: 'text', value: 'raw' }],
			},
		],
	});
});

it('passes exact element index and parent to allowElement', () => {
	const seen: Array<[string, number, string]> = [];
	processSync({
		children: 'one\n\n## two',
		allowElement(node, index, parent) {
			seen.push([node.tagName, index, parent?.type || 'none']);
			return node.tagName !== 'h2';
		},
	});
	expect(seen).toEqual([
		['p', 0, 'root'],
		['h2', 2, 'root'],
	]);
});

it('filters plugin-created nodes', () => {
	const addUnsafe = () => (tree: Root) => {
		tree.children.push({
			type: 'element',
			tagName: 'script',
			properties: {},
			children: [{ type: 'text', value: 'nope' }],
		});
	};
	expect(
		processSync({ children: '', rehypePlugins: [addUnsafe], allowedElements: ['p'] }).children,
	).toEqual([]);
});

it('mutates URL properties before allowElement observes the node', () => {
	let observed: unknown;
	processSync({
		children: '[x](custom:value)',
		urlTransform: () => 'rewritten',
		allowElement(node) {
			if (node.tagName === 'a') observed = node.properties.href;
			return true;
		},
	});
	expect(observed).toBe('rewritten');
});

it('unwraps children in place without skipping following siblings', () => {
	const tree: Root = {
		type: 'root',
		children: [
			{
				type: 'element',
				tagName: 'bad',
				properties: {},
				children: [{ type: 'element', tagName: 'em', properties: {}, children: [] }],
			} as Element,
			{ type: 'element', tagName: 'bad', properties: {}, children: [] } as Element,
		],
	};
	transformTree(tree, { disallowedElements: ['bad'], unwrapDisallowed: true });
	expect(tree.children).toEqual([{ type: 'element', tagName: 'em', properties: {}, children: [] }]);
});
