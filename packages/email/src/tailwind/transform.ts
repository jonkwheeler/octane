import {
	generate,
	List,
	parse,
	walk,
	type Atrule,
	type CssNode,
	type Declaration,
	type Dimension,
	type FunctionNode,
	type NumberNode,
	type Percentage,
	type Rule,
} from 'css-tree';
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
					if (!value.property.startsWith('--')) {
						const important = value.important ? ' !important' : '';
						const resolvedValue = resolveCssVariables(generate(value.value), customProperties);
						declarations += `${value.property}:${sanitizeOklchColors(resolvedValue, 'value')}${important};`;
					}
				},
			});
			if (declarations) inline.set(className, declarations);
			list?.remove(item);
		},
	});
	// What remains is media/pseudo CSS plus Tailwind's supporting at-rules.
	if (ast.type !== 'StyleSheet') throw new Error('Tailwind generated an invalid stylesheet.');
	for (const node of ast.children) nonInlineNodes.push(node as Rule | Atrule);
	const nonInline =
		nonInlineNodes.length > 0
			? sanitizeOklchColors(resolveCssVariables(generate(ast), customProperties), 'stylesheet')
			: '';
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
			const selfClosing = /(\s*\/\s*)$/.exec(after);
			if (selfClosing) {
				const attributes = after.slice(0, selfClosing.index);
				return `<${before}class="${names}"${attributes} style="${generated}"${selfClosing[1]}>`;
			}
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

const OKLAB_TO_LMS = {
	l: [0.3963377773761749, 0.2158037573099136],
	m: [-0.1055613458156586, -0.0638541728258133],
	s: [-0.0894841775298119, -1.2914855480194092],
} as const;

const LMS_TO_RGB = {
	r: [4.076741636075958, -3.307711539258063, 0.2309699031821043],
	g: [-1.2684379732850315, 2.609757349287688, -0.341319376002657],
	b: [-0.0041960761386756, -0.7034186179359362, 1.7076146940746117],
} as const;

function sanitizeOklchColors(value: string, context: 'stylesheet' | 'value'): string {
	if (!/oklch\(/i.test(value)) return value;
	const ast = parse(value, { context });
	walk(ast, {
		visit: 'Function',
		enter(node, item) {
			const color = node as FunctionNode;
			if (color.name.toLowerCase() !== 'oklch') return;
			item.data = oklchToRgbNode(color);
		},
	});
	return generate(ast);
}

function oklchToRgbNode(color: FunctionNode): FunctionNode {
	let lightness: number | undefined;
	let chroma: number | undefined;
	let hue: number | undefined;
	let alpha: number | undefined;

	for (const child of color.children) {
		if (child.type === 'Number') {
			const value = Number.parseFloat((child as NumberNode).value);
			if (lightness === undefined) lightness = value;
			else if (chroma === undefined) chroma = value;
			else if (hue === undefined) hue = value;
			else if (alpha === undefined) alpha = value;
		} else if (child.type === 'Dimension') {
			const value = child as Dimension;
			if (hue === undefined && value.unit.toLowerCase() === 'deg') {
				hue = Number.parseFloat(value.value);
			}
		} else if (child.type === 'Percentage') {
			const value = Number.parseFloat((child as Percentage).value) / 100;
			if (lightness === undefined) lightness = value;
			else if (alpha === undefined) alpha = value;
		}
	}

	if (lightness === undefined || chroma === undefined || hue === undefined) {
		throw new Error(`Could not convert unsupported color ${generate(color)} to rgb().`);
	}

	const hueRadians = (hue / 180) * Math.PI;
	const a = chroma * Math.cos(hueRadians);
	const b = chroma * Math.sin(hueRadians);
	const l = (lightness + OKLAB_TO_LMS.l[0] * a + OKLAB_TO_LMS.l[1] * b) ** 3;
	const m = (lightness + OKLAB_TO_LMS.m[0] * a + OKLAB_TO_LMS.m[1] * b) ** 3;
	const s = (lightness + OKLAB_TO_LMS.s[0] * a + OKLAB_TO_LMS.s[1] * b) ** 3;
	const red = clampRgb(
		255 * linearRgbToRgb(LMS_TO_RGB.r[0] * l + LMS_TO_RGB.r[1] * m + LMS_TO_RGB.r[2] * s),
	);
	const green = clampRgb(
		255 * linearRgbToRgb(LMS_TO_RGB.g[0] * l + LMS_TO_RGB.g[1] * m + LMS_TO_RGB.g[2] * s),
	);
	const blue = clampRgb(
		255 * linearRgbToRgb(LMS_TO_RGB.b[0] * l + LMS_TO_RGB.b[1] * m + LMS_TO_RGB.b[2] * s),
	);
	const children: CssNode[] = [
		rgbNumber(red),
		rgbComma(),
		rgbNumber(green),
		rgbComma(),
		rgbNumber(blue),
	];
	if (alpha !== undefined && alpha !== 1) children.push(rgbComma(), rgbNumber(alpha, false));
	return { type: 'Function', name: 'rgb', children: new List<CssNode>().fromArray(children) };
}

function linearRgbToRgb(value: number): number {
	const absolute = Math.abs(value);
	const sign = value < 0 ? -1 : 1;
	return absolute > 0.0031308 ? sign * (absolute ** (1 / 2.4) * 1.055 - 0.055) : value * 12.92;
}

function clampRgb(value: number): number {
	return Math.min(Math.max(value, 0), 255);
}

function rgbNumber(value: number, round = true): NumberNode {
	return { type: 'Number', value: round ? value.toFixed(0) : value.toString() };
}

function rgbComma(): CssNode {
	return { type: 'Operator', value: ',' };
}
