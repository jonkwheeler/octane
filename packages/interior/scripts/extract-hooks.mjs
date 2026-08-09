#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const COMPONENTS = join(__dirname, '../src/components');
const HOOKS = join(__dirname, '../src/hooks');

const OCTANE_HOOKS = [
	'useState',
	'useEffect',
	'useLayoutEffect',
	'useCallback',
	'useMemo',
	'useRef',
	'useId',
	'useSyncExternalStore',
	'useContext',
	'useImperativeHandle',
	'useReducer',
];
const MOTION_HOOKS = [
	'useMotionValue',
	'useTransform',
	'useScroll',
	'useSpring',
	'useInView',
	'useMotionValueEvent',
	'useIsomorphicLayoutEffect',
];
const SKIP = new Set(['copy-button']);

function walk(dir) {
	const out = [];
	for (const name of readdirSync(dir)) {
		const full = join(dir, name);
		if (statSync(full).isDirectory()) out.push(...walk(full));
		else if (full.endsWith('.tsrx')) out.push(full);
	}
	return out;
}

function findMatchingParen(source, openIndex) {
	let depth = 0;
	for (let i = openIndex; i < source.length; i++) {
		if (source[i] === '(') depth++;
		else if (source[i] === ')') {
			depth--;
			if (depth === 0) return i;
		}
	}
	return -1;
}

function findMatchingBrace(source, openIndex) {
	let depth = 0;
	for (let i = openIndex; i < source.length; i++) {
		if (source[i] === '{') depth++;
		else if (source[i] === '}') {
			depth--;
			if (depth === 0) return i;
		}
	}
	return -1;
}

function extractTopLevelFunctions(source) {
	const functions = [];
	const re = /^function (use[A-Za-z0-9_]+)/gm;
	let match;
	while ((match = re.exec(source)) !== null) {
		const start = match.index;
		const parenStart = source.indexOf('(', match.index + match[0].length - 1);
		const parenEnd = findMatchingParen(source, parenStart);
		const braceStart = source.indexOf('{', parenEnd);
		if (braceStart === -1) continue;
		const braceEnd = findMatchingBrace(source, braceStart);
		if (braceEnd === -1) continue;
		functions.push({
			name: match[1],
			text: source.slice(start, braceEnd + 1),
			start,
			end: braceEnd + 1,
		});
	}
	return functions;
}

function extractPreamble(source, firstHookStart) {
	const head = source.slice(0, firstHookStart);
	const lines = head.split('\n');
	const kept = [];
	let i = 0;
	while (i < lines.length) {
		const line = lines[i];
		if (/^import\b/.test(line.trim())) {
			while (i < lines.length && !/;\s*$/.test(lines[i])) i++;
			i++;
			continue;
		}
		if (/^export type\b/.test(line.trim())) {
			kept.push(line);
			i++;
			while (i < lines.length) {
				kept.push(lines[i]);
				if (/};\s*$/.test(lines[i])) {
					i++;
					break;
				}
				i++;
			}
			continue;
		}
		if (/^function /.test(line.trim()) && !/^function use/.test(line.trim())) {
			const fnLines = [line];
			i++;
			let depth = (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
			while (i < lines.length && depth > 0) {
				fnLines.push(lines[i]);
				depth += (lines[i].match(/\{/g) || []).length - (lines[i].match(/\}/g) || []).length;
				i++;
			}
			kept.push(fnLines.join('\n'));
			continue;
		}
		i++;
	}
	return kept.join('\n').trim();
}

function collectHookImports(fnText) {
	const octane = new Set();
	const motion = new Set();
	let needsReducedMotion = false;
	for (const hook of OCTANE_HOOKS) if (new RegExp(`\\b${hook}\\b`).test(fnText)) octane.add(hook);
	for (const hook of MOTION_HOOKS) if (new RegExp(`\\b${hook}\\b`).test(fnText)) motion.add(hook);
	if (/\buseReducedMotion\b/.test(fnText)) needsReducedMotion = true;
	return { octane, motion, needsReducedMotion };
}

function instrumentHookCalls(body) {
	let tag = 0;
	let out = body;
	function nextTag() {
		tag += 1;
		return `slot, 'h${tag}'`;
	}
	function instrument(name, sourceText) {
		const re = new RegExp(`\\b${name}(?:<[^>]*>)?\\s*\\(`, 'g');
		const matches = [];
		let m;
		while ((m = re.exec(sourceText)) !== null) {
			const open = m.index + m[0].length - 1;
			const close = findMatchingParen(sourceText, open);
			if (close !== -1) matches.push({ start: m.index, open, close });
		}
		let result = sourceText;
		for (let i = matches.length - 1; i >= 0; i--) {
			const { start, open, close } = matches[i];
			const inner = result
				.slice(open + 1, close)
				.trimEnd()
				.replace(/,\s*$/, '');
			const tagExpr = `subSlot(${nextTag()})`;
			const slotty =
				name === 'useState' || name === 'useRef' || name === 'useId' || name === 'useReducedMotion';
			const replacement = slotty
				? inner.length
					? `${name}(${inner}, ${tagExpr})`
					: `${name}(${tagExpr})`
				: inner.length
					? `${name}(${inner}, ${tagExpr})`
					: `${name}(${tagExpr})`;
			result = result.slice(0, start) + replacement + result.slice(close + 1);
		}
		return result;
	}
	for (const hook of [...OCTANE_HOOKS, 'useReducedMotion', ...MOTION_HOOKS])
		out = instrument(hook, out);
	return out;
}

function convertFunctionToExport(fnText) {
	const nameMatch = fnText.match(/^function (use[A-Za-z0-9_]+)/);
	if (!nameMatch) return fnText;
	const parenStart = fnText.indexOf('(', nameMatch[0].length - 1);
	const parenEnd = findMatchingParen(fnText, parenStart);
	const params = fnText.slice(parenStart + 1, parenEnd).trim();
	const braceStart = fnText.indexOf('{', parenEnd);
	const braceEnd = findMatchingBrace(fnText, braceStart);
	const body = instrumentHookCalls(fnText.slice(braceStart + 1, braceEnd));
	const restParams = params.length
		? `${params}, ...rest: [slot?: symbol]`
		: '...rest: [slot?: symbol]';
	return `export function ${nameMatch[1]}(${restParams}) {\n  const slot = resolveHookSlot(rest);${body}\n}`;
}

function insertAfterImports(source, line) {
	const lines = source.split('\n');
	let lastImportEnd = -1;
	for (let i = 0; i < lines.length; i++) {
		if (/^import\b/.test(lines[i].trim())) {
			while (i < lines.length && !/;\s*$/.test(lines[i])) i++;
			lastImportEnd = i;
		}
	}
	if (lastImportEnd === -1) return `${line}\n${source}`;
	lines.splice(lastImportEnd + 1, 0, line);
	return lines.join('\n');
}

function migrateReducedMotionImport(source) {
	return source.replace(
		/import \{([^}]*)\} from '@octanejs\/motion';/g,
		function split(_m, imports) {
			const parts = imports.split(',').map(function trim(p) {
				return p.trim();
			});
			const motionParts = parts.filter(function keep(p) {
				return p && p !== 'useReducedMotion';
			});
			const out = [];
			if (motionParts.length)
				out.push(`import { ${motionParts.join(', ')} } from '@octanejs/motion';`);
			if (parts.includes('useReducedMotion'))
				out.push(`import { useReducedMotion } from '../hooks/reduced-motion';`);
			return out.join('\n');
		},
	);
}

function processComponent(file) {
	const name = basename(file, '.tsrx');
	if (SKIP.has(name)) return;
	const hookFile = join(HOOKS, `${name}.ts`);
	if (existsSync(hookFile)) return;

	let source = readFileSync(file, 'utf8');
	const functions = extractTopLevelFunctions(source);
	if (!functions.length) return;

	const preamble = extractPreamble(source, functions[0].start);
	const merged = functions.reduce(
		function acc(cur, fn) {
			const found = collectHookImports(fn.text);
			for (const h of found.octane) cur.octane.add(h);
			for (const h of found.motion) cur.motion.add(h);
			cur.needsReducedMotion ||= found.needsReducedMotion;
			return cur;
		},
		{ octane: new Set(), motion: new Set(), needsReducedMotion: false },
	);

	const hookImports = [];
	if (merged.octane.size)
		hookImports.push(`import { ${[...merged.octane].sort().join(', ')} } from 'octane';`);
	if (merged.motion.size)
		hookImports.push(`import { ${[...merged.motion].sort().join(', ')} } from '@octanejs/motion';`);
	if (merged.needsReducedMotion)
		hookImports.push(`import { useReducedMotion } from './reduced-motion';`);
	hookImports.push(`import { resolveHookSlot, subSlot } from './slot';`);

	const hookSource = `${hookImports.join('\n')}\n\n${preamble ? `${preamble}\n\n` : ''}${functions
		.map(function mapFn(fn) {
			return convertFunctionToExport(fn.text);
		})
		.join('\n\n')}\n`;
	writeFileSync(hookFile, hookSource);

	let component = source;
	for (let i = functions.length - 1; i >= 0; i--) {
		component = component.slice(0, functions[i].start) + component.slice(functions[i].end);
	}
	component = component.replace(/\n{3,}/g, '\n\n');
	component = migrateReducedMotionImport(component);
	component = insertAfterImports(
		component,
		`import { ${functions
			.map(function f(fn) {
				return fn.name;
			})
			.join(', ')} } from '../hooks/${name}';`,
	);

	const stillNeeds = new Set();
	for (const hook of OCTANE_HOOKS)
		if (new RegExp(`\\b${hook}\\b`).test(component)) stillNeeds.add(hook);
	component = component.replace(
		/^import \{([^}]+)\} from 'octane';?\n/gm,
		function trim(_m, imports) {
			const kept = imports
				.split(',')
				.map(function trim(p) {
					return p.trim();
				})
				.filter(function keep(p) {
					const base = p
						.replace(/^type\s+/, '')
						.split(/\s+as\s+/)[0]
						.trim();
					return stillNeeds.has(base) || base === 'createContext';
				});
			return kept.length ? `import { ${kept.join(', ')} } from 'octane';\n` : '';
		},
	);
	writeFileSync(file, component);
}

for (const file of readdirSync(HOOKS)) {
	if (file === 'slot.ts' || file === 'reduced-motion.ts' || file === 'copy-button.ts') continue;
	rmSync(join(HOOKS, file));
}
for (const file of walk(COMPONENTS).sort()) processComponent(file);
console.log('done');
