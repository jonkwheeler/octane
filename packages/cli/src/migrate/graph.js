import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { parseModule } from '@tsrx/core';

const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.tsrx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs'];
const IGNORED_DIRECTORIES = new Set(['node_modules', '.git', '.next', 'dist', 'build']);

/**
 * @typedef {{
 *   kind: 'static' | 'dynamic-static' | 'dynamic-computed',
 *   specifier: string | null,
 *   location: import('./findings.js').SourceLocation | null,
 *   typeOnly: boolean
 * }} ImportReference
 */

/** @param {string[]} entries @returns {string[]} */
export function expandMigrationEntries(entries) {
	/** @type {string[]} */
	const files = [];
	/** @type {string[]} */
	const queue = entries.map((entry) => path.resolve(entry));
	while (queue.length > 0) {
		const candidate = queue.shift();
		if (candidate === undefined) break;
		if (!existsSync(candidate)) {
			files.push(candidate);
			continue;
		}
		let stat;
		try {
			stat = statSync(candidate);
		} catch {
			files.push(candidate);
			continue;
		}
		if (!stat.isDirectory()) {
			if (SOURCE_EXTENSIONS.includes(path.extname(candidate))) files.push(candidate);
			continue;
		}
		for (const entry of readdirSync(candidate, { withFileTypes: true }).sort((a, b) =>
			a.name.localeCompare(b.name),
		)) {
			if (entry.isDirectory() && IGNORED_DIRECTORIES.has(entry.name)) continue;
			queue.push(path.join(candidate, entry.name));
		}
	}
	return [...new Set(files)].sort();
}

/** @param {any} node @returns {import('./findings.js').SourceLocation | null} */
function sourceLocation(node) {
	return node?.loc?.start ? { line: node.loc.start.line, column: node.loc.start.column + 1 } : null;
}

/** @param {any} node @param {(node: any) => void} visit */
function walk(node, visit) {
	if (!node || typeof node !== 'object') return;
	visit(node);
	for (const [key, value] of Object.entries(node)) {
		if (key === 'loc' || key === 'metadata') continue;
		if (Array.isArray(value)) {
			for (const child of value) walk(child, visit);
		} else {
			walk(value, visit);
		}
	}
}

/** @param {any} ast @returns {ImportReference[]} */
function importsFrom(ast) {
	/** @type {ImportReference[]} */
	const imports = [];
	walk(ast, (node) => {
		if (
			(node.type === 'ImportDeclaration' ||
				node.type === 'ExportNamedDeclaration' ||
				node.type === 'ExportAllDeclaration') &&
			typeof node.source?.value === 'string'
		) {
			imports.push({
				kind: 'static',
				specifier: node.source.value,
				location: sourceLocation(node.source),
				typeOnly:
					(node.type === 'ImportDeclaration' &&
						(node.importKind === 'type' ||
							(node.specifiers?.length > 0 &&
								node.specifiers.every(
									(/** @type {any} */ specifier) => specifier.importKind === 'type',
								)))) ||
					(node.type === 'ExportNamedDeclaration' &&
						(node.exportKind === 'type' ||
							(node.specifiers?.length > 0 &&
								node.specifiers.every(
									(/** @type {any} */ specifier) => specifier.exportKind === 'type',
								)))),
			});
		}
		if (node.type === 'ImportExpression') {
			imports.push({
				kind: typeof node.source?.value === 'string' ? 'dynamic-static' : 'dynamic-computed',
				specifier: typeof node.source?.value === 'string' ? node.source.value : null,
				location: sourceLocation(node),
				typeOnly: false,
			});
		}
		if (
			node.type === 'CallExpression' &&
			node.callee?.type === 'Identifier' &&
			node.callee.name === 'require'
		) {
			const argument = node.arguments?.[0];
			imports.push({
				kind: typeof argument?.value === 'string' ? 'static' : 'dynamic-computed',
				specifier: typeof argument?.value === 'string' ? argument.value : null,
				location: sourceLocation(node),
				typeOnly: false,
			});
		}
	});
	return imports;
}

/** @param {string} fromFile @param {string} specifier */
function resolveLocal(fromFile, specifier) {
	const base = path.resolve(path.dirname(fromFile), specifier);
	const candidates = [
		base,
		...SOURCE_EXTENSIONS.map((extension) => base + extension),
		...SOURCE_EXTENSIONS.map((extension) => path.join(base, 'index' + extension)),
	];
	return (
		candidates.find((candidate) => {
			try {
				return statSync(candidate).isFile();
			} catch {
				return false;
			}
		}) ?? null
	);
}

/**
 * @param {string[]} entries
 * @returns {{
 *   files: { file: string, source: string, ast: any, imports: ImportReference[], parseError: string | null }[],
 *   unresolved: { importer: string | null, specifier: string | null, location: import('./findings.js').SourceLocation | null, reason: string }[]
 * }}
 */
export function buildImportGraph(entries) {
	const queue = expandMigrationEntries(entries);
	/** @type {Set<string>} */
	const seen = new Set();
	/** @type {{ file: string, source: string, ast: any, imports: ImportReference[], parseError: string | null }[]} */
	const files = [];
	/** @type {{ importer: string | null, specifier: string | null, location: import('./findings.js').SourceLocation | null, reason: string }[]} */
	const unresolved = [];

	while (queue.length > 0) {
		const file = queue.shift();
		if (file === undefined) break;
		if (seen.has(file)) continue;
		seen.add(file);
		if (!existsSync(file)) {
			unresolved.push({ importer: null, specifier: file, location: null, reason: 'missing-entry' });
			continue;
		}

		const source = readFileSync(file, 'utf8');
		let ast;
		try {
			ast = parseModule(source, file);
		} catch (error) {
			files.push({ file, source, ast: null, imports: [], parseError: String(error) });
			continue;
		}
		const imports = importsFrom(ast);
		files.push({ file, source, ast, imports, parseError: null });

		for (const imported of imports) {
			if (imported.kind === 'dynamic-computed') {
				unresolved.push({
					importer: file,
					specifier: null,
					location: imported.location,
					reason: 'computed-import',
				});
				continue;
			}
			if (!imported.specifier?.startsWith('.') && !imported.specifier?.startsWith('/')) continue;
			const resolved = resolveLocal(file, imported.specifier);
			if (resolved) queue.push(resolved);
			else {
				unresolved.push({
					importer: file,
					specifier: imported.specifier,
					location: imported.location,
					reason: 'missing-local',
				});
			}
		}
	}

	return {
		files: files.sort((left, right) => left.file.localeCompare(right.file)),
		unresolved,
	};
}
