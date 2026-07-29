import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseModule } from '@tsrx/core';
import { analyzeMigration } from './analyze.js';
import { classifyPackageImport } from './classify.js';
import { applyTextEdits } from './edits.js';

const NATIVE_CHANGE_INPUT_TYPES = new Set([
	'button',
	'checkbox',
	'color',
	'date',
	'datetime-local',
	'file',
	'hidden',
	'image',
	'month',
	'radio',
	'range',
	'reset',
	'submit',
	'time',
	'week',
]);

/**
 * @typedef {{
 *   file: string,
 *   digest: string,
 *   edits: import('./edits.js').TextEdit[],
 *   changed: boolean,
 *   output: string
 * }} ConversionFile
 * @typedef {{
 *   schemaVersion: 1,
 *   root: string,
 *   report: import('./analyze.js').MigrationReport,
 *   files: ConversionFile[],
 *   blocked: boolean
 * }} ConversionPlan
 */

/** @param {string} source */
function digest(source) {
	return createHash('sha256').update(source).digest('hex');
}

/** @param {string} source */
function hasLeadingOctanePragma(source) {
	const leadingTrivia =
		/^\uFEFF?(?:(?:\s+)|(?:\/\/[^\n]*(?:\n|$))|(?:\/\*[\s\S]*?\*\/))*/.exec(source)?.[0] ?? '';
	return /@jsxImportSource\s+([^\s*]+)/.exec(leadingTrivia)?.[1] === 'octane';
}

/** @param {any} node @param {(node: any) => void} visit */
function walk(node, visit) {
	if (!node || typeof node !== 'object') return;
	visit(node);
	for (const [key, value] of Object.entries(node)) {
		if (key === 'loc' || key === 'metadata') continue;
		if (Array.isArray(value)) for (const child of value) walk(child, visit);
		else walk(value, visit);
	}
}

/** @param {any} node @returns {string | null} */
function jsxName(node) {
	if (node?.type === 'JSXIdentifier') return node.name;
	return null;
}

/** @param {any} node @returns {import('./edits.js').TextEdit | null} */
function textInputOnChangeEdit(node) {
	if (node.type !== 'JSXOpeningElement') return null;
	const host = jsxName(node.name);
	if (host !== 'input' && host !== 'textarea') return null;
	let onChange = null;
	let type = null;
	let hasDynamicType = false;
	for (const attribute of node.attributes ?? []) {
		if (attribute.type !== 'JSXAttribute') continue;
		const name = jsxName(attribute.name);
		if (name === 'onChange') onChange = attribute.name;
		if (name === 'type') {
			if (attribute.value?.type === 'Literal' || attribute.value?.type === 'StringLiteral') {
				type = String(attribute.value.value).toLowerCase();
			} else {
				hasDynamicType = true;
			}
		}
	}
	if (
		!onChange ||
		(host === 'input' && (hasDynamicType || (type !== null && NATIVE_CHANGE_INPUT_TYPES.has(type))))
	)
		return null;
	return { start: onChange.start, end: onChange.end, text: 'onInput', reason: 'native-text-input' };
}

/** @param {string} root @param {string} file @returns {ConversionFile} */
function planFile(root, file) {
	const source = readFileSync(file, 'utf8');
	const ast = parseModule(source, file);
	/** @type {import('./edits.js').TextEdit[]} */
	const edits = [];

	for (const node of ast.body ?? []) {
		if (
			(node.type !== 'ImportDeclaration' &&
				node.type !== 'ExportNamedDeclaration' &&
				node.type !== 'ExportAllDeclaration') ||
			typeof node.source?.value !== 'string'
		)
			continue;
		if (
			node.importKind === 'type' ||
			node.exportKind === 'type' ||
			(node.type === 'ExportNamedDeclaration' &&
				node.specifiers?.length > 0 &&
				node.specifiers.every((/** @type {any} */ specifier) => specifier.exportKind === 'type'))
		)
			continue;
		const classified = classifyPackageImport(root, node.source.value, file);
		if (classified.classification !== 'supported' || !classified.replacement) continue;
		if (classified.replacement === node.source.value) continue;
		edits.push({
			start: node.source.start + 1,
			end: node.source.end - 1,
			text: classified.replacement,
			reason: 'supported-import',
		});
	}

	walk(ast, (node) => {
		const edit = textInputOnChangeEdit(node);
		if (edit) edits.push(edit);
	});

	if (!hasLeadingOctanePragma(source)) {
		edits.push({
			start: 0,
			end: 0,
			text: '/** @jsxImportSource octane */\n',
			reason: 'jsx-ownership',
		});
	}

	const output = applyTextEdits(source, edits);
	return {
		file,
		digest: digest(source),
		edits: edits.sort((left, right) => left.start - right.start),
		changed: output !== source,
		output,
	};
}

/**
 * @param {{ root: string, entries: string[] }} input
 * @returns {ConversionPlan}
 */
export function createConversionPlan({ root, entries }) {
	const projectRoot = path.resolve(root);
	const report = analyzeMigration({ root: projectRoot, entries });
	if (report.blocked) {
		return { schemaVersion: 1, root: projectRoot, report, files: [], blocked: true };
	}
	return {
		schemaVersion: 1,
		root: projectRoot,
		report,
		files: report.candidateBoundaries.map((file) => planFile(projectRoot, file)),
		blocked: false,
	};
}

/**
 * @param {ConversionPlan} plan
 * @returns {{ file: string, applied: boolean, conflict: boolean }[]}
 */
export function applyConversionPlan(plan) {
	/** @type {{ file: string, applied: boolean, conflict: boolean }[]} */
	const results = [];
	for (const file of plan.files) {
		const current = readFileSync(file.file, 'utf8');
		if (digest(current) !== file.digest) {
			results.push({ file: file.file, applied: false, conflict: true });
			continue;
		}
		if (file.changed) writeFileSync(file.file, file.output);
		results.push({ file: file.file, applied: file.changed, conflict: false });
	}
	return results;
}
