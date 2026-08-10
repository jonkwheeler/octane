import { generate, parse, walk, type Atrule, type Declaration, type Rule } from 'css-tree';
import { compile } from 'tailwindcss';
import { collectTailwindBoundaries, type TailwindBoundaryOptions } from './context.ts';

const DEFAULT_THEME = `@theme default {
--breakpoint-md:48rem;--spacing:0.25rem;
--font-size-sm:0.875rem;--text-sm--line-height:1.25rem;
--font-size-lg:1.125rem;--text-lg--line-height:1.75rem;
--color-blue-500:oklch(62.3% .214 259.815);--color-red-500:oklch(63.7% .237 25.331);
}`;

interface CompiledStyles {
	inline: Map<string, string>;
	nonInline: string;
}

export async function renderWithTailwind(render: () => string | Promise<string>): Promise<string> {
	const { value: html, boundaries } = await collectTailwindBoundaries(render);
	return transformTailwindHtml(html, boundaries);
}

export async function transformTailwindHtml(
	html: string,
	boundaries: ReadonlyMap<string, TailwindBoundaryOptions>,
): Promise<string> {
	let output = html;
	for (const [id, options] of boundaries) {
		const escapedId = escapeRegExp(id);
		const boundaryPattern = new RegExp(
			`<template[^>]*data-octane-email-tailwind-start=["']${escapedId}["'][^>]*><\\/template>([\\s\\S]*?)<template[^>]*data-octane-email-tailwind-end=["']${escapedId}["'][^>]*><\\/template>`,
		);
		const match = boundaryPattern.exec(output);
		if (!match) continue;
		const fragment = match[1];
		if (fragment.includes('data-octane-email-tailwind-start')) {
			throw new Error('Tailwind boundaries cannot be nested. Use a single Tailwind configuration.');
		}
		const classes = collectClasses(fragment);
		const styles = await compileStyles(classes, options);
		const transformed = inlineFragment(fragment, styles.inline);
		output = output.replace(boundaryPattern, () => transformed);
		if (styles.nonInline) output = injectHeadStyle(output, styles.nonInline);
	}
	return output;
}

async function compileStyles(
	classes: string[],
	options: TailwindBoundaryOptions,
): Promise<CompiledStyles> {
	if (classes.length === 0) return { inline: new Map(), nonInline: '' };
	const css = `@layer theme, utilities;${DEFAULT_THEME}${options.theme ?? ''}\n@tailwind utilities;${options.utility ?? ''}\n@config;`;
	const compiler = await compile(css, {
		polyfills: 0,
		async loadModule(id, base, resourceHint) {
			if (resourceHint === 'config') return { path: id, base, module: options.config ?? {} };
			throw new Error(`Unsupported Tailwind module: ${id}`);
		},
	});
	const ast = parse(compiler.build(classes), { context: 'stylesheet' });
	const inline = new Map<string, string>();
	const customProperties = new Map<string, string>();
	const nonInlineNodes: Array<Rule | Atrule> = [];
	walk(ast, {
		visit: 'Rule',
		enter(node, item, list) {
			const rule = node as Rule;
			const selector = generate(rule.prelude);
			const parent = this.atrule;
			if (!parent && (selector === ':root' || selector === ':root,:host')) {
				walk(rule.block, {
					visit: 'Declaration',
					enter(declaration) {
						const value = declaration as Declaration;
						if (value.property.startsWith('--'))
							customProperties.set(value.property, generate(value.value));
					},
				});
				list?.remove(item);
				return;
			}
			const className = selectorToClass(selector);
			if (!className || parent || selector.includes(':')) return;
			let declarations = '';
			walk(rule.block, {
				visit: 'Declaration',
				enter(declaration) {
					const value = declaration as Declaration;
					if (!value.property.startsWith('--'))
						declarations += `${value.property}:${generate(value.value)};`;
				},
			});
			if (declarations) inline.set(className, resolveCssVariables(declarations, customProperties));
			list?.remove(item);
		},
	});
	// What remains is media/pseudo CSS plus Tailwind's supporting at-rules.
	if (ast.type !== 'StyleSheet') throw new Error('Tailwind generated an invalid stylesheet.');
	for (const node of ast.children) nonInlineNodes.push(node as Rule | Atrule);
	const nonInline =
		nonInlineNodes.length > 0 ? resolveCssVariables(generate(ast), customProperties) : '';
	return { inline, nonInline };
}

function collectClasses(html: string): string[] {
	const classes = new Set<string>();
	for (const match of html.matchAll(/\bclass=["']([^"']*)["']/g)) {
		for (const name of match[1].trim().split(/\s+/)) if (name) classes.add(name);
	}
	return [...classes];
}

function inlineFragment(html: string, styles: ReadonlyMap<string, string>): string {
	return html.replace(
		/<([a-z][^>]*?)\bclass=["']([^"']*)["']([^>]*)>/gi,
		(tag, before, names, after) => {
			const generated = names
				.split(/\s+/)
				.map((name: string) => styles.get(name) ?? '')
				.join('');
			if (!generated) return tag;
			const existing = /\bstyle=["']([^"']*)["']/.exec(`${before}${after}`);
			if (existing) return tag.replace(existing[0], `style="${generated}${existing[1]}"`);
			return `<${before}class="${names}"${after} style="${generated}">`;
		},
	);
}

function injectHeadStyle(html: string, css: string): string {
	const style = `<style>${css}</style>`;
	if (/<\/head>/i.test(html)) return html.replace(/<\/head>/i, () => `${style}</head>`);
	throw new Error('Tailwind: <head> not found. Move <Head /> inside <Tailwind>.');
}

function selectorToClass(selector: string): string | undefined {
	const match = /^\.((?:\\.|[\w-!])+)$/.exec(selector);
	return match?.[1].replace(/\\(.)/g, '$1');
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function resolveCssVariables(value: string, variables: ReadonlyMap<string, string>): string {
	let resolved = value;
	for (let pass = 0; pass < 8 && resolved.includes('var('); pass++) {
		resolved = resolved.replace(
			/var\((--[\w-]+)(?:,\s*([^()]+))?\)/g,
			(_match, name, fallback) => variables.get(name) ?? fallback ?? `var(${name})`,
		);
	}
	return resolved;
}
