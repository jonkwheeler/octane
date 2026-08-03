import { describe, expect, it } from 'vitest';
import { flushSync } from 'octane';
import { flushEffects, mount } from '../../octane/tests/_helpers';
import createAsyncHighlighter from '../src/async-syntax-highlighter.js';

function deferred<T>() {
	let resolve!: (value: T) => void;
	let reject!: (reason?: unknown) => void;
	const promise = new Promise<T>((resolvePromise, rejectPromise) => {
		resolve = resolvePromise;
		reject = rejectPromise;
	});
	return { promise, resolve, reject };
}

async function settle() {
	for (let index = 0; index < 6; index++) await Promise.resolve();
	flushEffects();
	flushSync(() => {});
}

function generator() {
	const languages = new Set<string>();
	return {
		languages,
		listLanguages: () => [...languages],
		registerLanguage: (name: string) => languages.add(name),
		highlight: (code: string, language: string) => {
			if (!languages.has(language)) throw new Error(`missing ${language}`);
			return [
				{
					type: 'element',
					tagName: 'span',
					properties: { className: [`language-${language}`] },
					children: [{ type: 'text', value: code }],
				},
			];
		},
	};
}

describe('async lifecycle parity', () => {
	// @parity-case conformance:async-registration-queue
	it('queues registration before the AST generator settles', async () => {
		const ast = generator();
		const astLoader = deferred<typeof ast>();
		const Highlighter = createAsyncHighlighter({
			loader: () => astLoader.promise,
			isLanguageRegistered: (instance: typeof ast, language: string) =>
				instance.languages.has(language),
			registerLanguage: (instance: typeof ast, name: string) => instance.registerLanguage(name),
			languageLoaders: {},
		});

		Highlighter.registerLanguage('queued', {});
		expect(Highlighter.isRegistered('queued')).toBe(true);

		const preload = Highlighter.preload();
		astLoader.resolve(ast);
		await preload;

		expect(ast.languages).toEqual(new Set(['queued']));
		expect(Highlighter.isRegistered('queued')).toBe(true);
	});

	// @parity-case conformance:async-stale-language
	it('ignores an older language completion after switching languages', async () => {
		const ast = generator();
		const astLoader = deferred<typeof ast>();
		const languageA = deferred<void>();
		const languageB = deferred<void>();
		const Highlighter = createAsyncHighlighter({
			loader: () => astLoader.promise,
			isLanguageRegistered: (instance: typeof ast, language: string) =>
				instance.languages.has(language),
			registerLanguage: (instance: typeof ast, name: string) => instance.registerLanguage(name),
			languageLoaders: {
				a: async (register: (name: string, language: unknown) => void) => {
					await languageA.promise;
					register('a', {});
				},
				b: async (register: (name: string, language: unknown) => void) => {
					await languageB.promise;
					register('b', {});
				},
			},
		});

		const result = mount(Highlighter, { language: 'a', children: 'current' });
		flushEffects();
		result.update(Highlighter, { language: 'b', children: 'current' });
		flushEffects();

		astLoader.resolve(ast);
		languageB.resolve();
		await settle();
		expect(result.html()).toContain('language-b');
		expect(result.find('code').textContent).toBe('current');

		languageA.resolve();
		await settle();
		expect(ast.languages).toEqual(new Set(['b', 'a']));
		expect(result.html()).toContain('language-b');
		expect(result.find('code').textContent).toBe('current');
		expect(result.container.querySelector('.language-a')).toBeNull();
		result.unmount();
	});

	// @parity-case conformance:async-rejection-fallback
	it('keeps deterministic plain output when a language loader rejects', async () => {
		const ast = generator();
		const Highlighter = createAsyncHighlighter({
			loader: async () => ast,
			isLanguageRegistered: (instance: typeof ast, language: string) =>
				instance.languages.has(language),
			registerLanguage: (instance: typeof ast, name: string) => instance.registerLanguage(name),
			languageLoaders: {
				broken: async () => {
					throw new Error('expected loader failure');
				},
			},
		});

		const result = mount(Highlighter, { language: 'broken', children: 'plain text' });
		flushEffects();
		await settle();

		expect(result.find('code').textContent).toBe('plain text');
		expect(result.find('code').querySelector('[class]')).toBeNull();
		result.unmount();
	});
});
