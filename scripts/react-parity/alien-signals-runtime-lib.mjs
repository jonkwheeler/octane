/**
 * One-for-one pristine/adapted runtime crosswalk for alien-signals.
 * Compares titles, normalized assertion contracts, and fixture integrity
 * under packages/alien-signals/audit/runtime-transformation-ledger.json.
 */

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';

const DISABLED_REGISTRATION =
	/\b(?:fdescribe|fit|xdescribe|xit|xtest)(?:\s*\(|\.each\s*\()|\b(?:describe|it|test)\.(?:failing|fails|only|skip|todo)(?:\s*\(|\.each\s*\()/;

const MATCHER_NAMES = new Set([
	'toBe',
	'toEqual',
	'toHaveBeenCalledTimes',
	'toBeDefined',
	'toBeGreaterThan',
	'toBeNull',
	'toBeUndefined',
]);

export const RUNTIME_TRANSFORMS_LEDGER =
	'packages/alien-signals/audit/runtime-transformation-ledger.json';

export function titlesFromInventory(inventory) {
	return (inventory?.tests ?? [])
		.map(function titleOf(test) {
			return test.fullName;
		})
		.sort();
}

export function describeTitleMismatch(pristineTitles, adaptedTitles) {
	const pristineSet = new Set(pristineTitles);
	const adaptedSet = new Set(adaptedTitles);
	const missing = pristineTitles.filter(function notInAdapted(title) {
		return !adaptedSet.has(title);
	});
	const extra = adaptedTitles.filter(function notInPristine(title) {
		return !pristineSet.has(title);
	});
	const parts = [];
	if (missing.length > 0) parts.push(`missing adapted titles: ${missing.join('; ')}`);
	if (extra.length > 0) parts.push(`extra adapted titles: ${extra.join('; ')}`);
	if (pristineTitles.length !== adaptedTitles.length) {
		parts.push(`count ${adaptedTitles.length} !== pristine ${pristineTitles.length}`);
	}
	return parts.join('; ');
}

function stripSuitePrefix(fullName) {
	return fullName.replace(/^Alien React Library\s+/, '');
}

function isJsonStringifyCall(node) {
	return (
		ts.isCallExpression(node) &&
		ts.isPropertyAccessExpression(node.expression) &&
		ts.isIdentifier(node.expression.expression) &&
		node.expression.expression.text === 'JSON' &&
		ts.isIdentifier(node.expression.name) &&
		node.expression.name.text === 'stringify' &&
		node.arguments[0] !== undefined
	);
}

function evaluateLiteral(node, sourceFile) {
	if (node === undefined) return { kind: 'empty', text: '' };
	if (isJsonStringifyCall(node)) {
		return evaluateLiteral(node.arguments[0], sourceFile);
	}
	if (
		ts.isStringLiteral(node) ||
		ts.isNoSubstitutionTemplateLiteral(node) ||
		(typeof ts.isNumericLiteral === 'function' && ts.isNumericLiteral(node)) ||
		ts.isPrefixUnaryExpression(node) ||
		node.kind === ts.SyntaxKind.TrueKeyword ||
		node.kind === ts.SyntaxKind.FalseKeyword ||
		node.kind === ts.SyntaxKind.NullKeyword ||
		node.kind === ts.SyntaxKind.UndefinedKeyword
	) {
		const text = node.getText(sourceFile).trim();
		try {
			const value = Function(`"use strict"; return (${text});`)();
			return { kind: 'value', value };
		} catch {
			return { kind: 'text', text: text.replace(/\s+/g, '') };
		}
	}
	if (ts.isObjectLiteralExpression(node) || ts.isArrayLiteralExpression(node)) {
		const text = node.getText(sourceFile);
		try {
			const value = Function(`"use strict"; return (${text});`)();
			return { kind: 'value', value };
		} catch {
			return { kind: 'text', text: text.replace(/\s+/g, '') };
		}
	}
	if (
		ts.isIdentifier(node) &&
		(node.text === 'undefined' || node.text === 'Infinity' || node.text === 'NaN')
	) {
		return { kind: 'value', value: Function(`"use strict"; return (${node.text});`)() };
	}
	return { kind: 'text', text: node.getText(sourceFile).replace(/\s+/g, '') };
}

function valueKey(value) {
	if (typeof value === 'string' && /^-?\d+(?:\.\d+)?$/.test(value)) {
		return JSON.stringify(Number(value));
	}
	if (value === undefined) return 'undefined';
	return JSON.stringify(value);
}

function normalizeContract(matcher, evaluated) {
	if (evaluated.kind === 'empty') return `${matcher}:`;
	if (evaluated.kind === 'text') return `${matcher}:${evaluated.text}`;
	return `${matcher}:${valueKey(evaluated.value)}`;
}

function expandContract(contract) {
	const separator = contract.indexOf(':');
	const matcher = contract.slice(0, separator);
	const payload = contract.slice(separator + 1);
	const expanded = new Set([contract]);
	if (matcher === 'toEqual' || matcher === 'toBe') {
		if (payload === 'undefined' || payload === '"undefined"') {
			expanded.add('toBe:undefined');
			expanded.add('toEqual:undefined');
			expanded.add('toBe:"undefined"');
		}
		if (payload === 'null' || payload === '"null"') {
			expanded.add('toBe:null');
			expanded.add('toEqual:null');
			expanded.add('toBe:"null"');
		}
		try {
			const value = payload === 'undefined' ? undefined : JSON.parse(payload);
			expanded.add(`toBe:${valueKey(value)}`);
			expanded.add(`toEqual:${valueKey(value)}`);
			if (value && typeof value === 'object' && !Array.isArray(value)) {
				const keys = Object.keys(value);
				if (keys.length === 1) {
					expanded.add(`toBe:${valueKey(value[keys[0]])}`);
					expanded.add(`toEqual:${valueKey(value[keys[0]])}`);
				}
				expanded.add(`toBe:${valueKey(JSON.stringify(value))}`);
			}
		} catch {
			// Non-JSON payloads stay as the original contract only.
		}
	}
	return expanded;
}

function callTitle(node, sourceFile) {
	if (!ts.isCallExpression(node)) return null;
	if (!ts.isIdentifier(node.expression)) return null;
	if (node.expression.text !== 'it' && node.expression.text !== 'test') return null;
	const titleNode = node.arguments[0];
	if (!titleNode || !ts.isStringLiteralLike(titleNode)) return null;
	return {
		title: titleNode.text,
		body: node.arguments[1],
	};
}

export function extractCaseAssertionContracts(source, fileName = 'suite.ts') {
	const sourceFile = ts.createSourceFile(
		fileName,
		source,
		ts.ScriptTarget.Latest,
		true,
		ts.ScriptKind.TS,
	);
	const cases = [];
	function visit(node) {
		const titled = callTitle(node, sourceFile);
		if (titled !== null && titled.body) {
			const contracts = [];
			function visitAssertions(assertionNode) {
				if (
					ts.isCallExpression(assertionNode) &&
					ts.isPropertyAccessExpression(assertionNode.expression) &&
					ts.isIdentifier(assertionNode.expression.name) &&
					MATCHER_NAMES.has(assertionNode.expression.name.text)
				) {
					const matcher = assertionNode.expression.name.text;
					contracts.push(
						normalizeContract(matcher, evaluateLiteral(assertionNode.arguments[0], sourceFile)),
					);
				}
				ts.forEachChild(assertionNode, visitAssertions);
			}
			visitAssertions(titled.body);
			cases.push({ title: titled.title, contracts });
			return;
		}
		ts.forEachChild(node, visit);
	}
	visit(sourceFile);
	return cases;
}

export function extractMountedFixtures(adaptedSource, fileName = 'adapted.ts') {
	const sourceFile = ts.createSourceFile(
		fileName,
		adaptedSource,
		ts.ScriptTarget.Latest,
		true,
		ts.ScriptKind.TS,
	);
	const fixtures = new Set();
	function visit(node) {
		if (
			ts.isCallExpression(node) &&
			ts.isIdentifier(node.expression) &&
			node.expression.text === 'mount' &&
			node.arguments[0] &&
			ts.isIdentifier(node.arguments[0])
		) {
			fixtures.add(node.arguments[0].text);
		}
		ts.forEachChild(node, visit);
	}
	visit(sourceFile);
	return [...fixtures].sort();
}

export function fixtureExportNames(fixtureSource) {
	return [...fixtureSource.matchAll(/^export\s+function\s+([A-Za-z0-9_]+)/gm)]
		.map(function nameOf(match) {
			return match[1];
		})
		.sort();
}

export function fixtureFileFingerprint(fixtureSource) {
	return createHash('sha256').update(fixtureSource.replace(/\r\n/g, '\n')).digest('hex');
}

function contractsCovered(pristineContracts, adaptedContracts) {
	const remaining = adaptedContracts.slice();
	for (const pristineContract of pristineContracts) {
		const candidates = expandContract(pristineContract);
		const index = remaining.findIndex(function matches(adaptedContract) {
			const adaptedExpanded = expandContract(adaptedContract);
			for (const candidate of candidates) {
				if (adaptedExpanded.has(candidate)) return true;
			}
			return false;
		});
		if (index === -1) return false;
		remaining.splice(index, 1);
	}
	return true;
}

export function assertRuntimeStructureCrosswalk({
	pristineSource,
	adaptedSource,
	fixtureSource,
	ledgerPath = RUNTIME_TRANSFORMS_LEDGER,
	repoRoot,
	expectedFixtureSha256,
} = {}) {
	let recordedFixtureSha256 = expectedFixtureSha256;
	if (repoRoot && ledgerPath) {
		const ledger = JSON.parse(readFileSync(resolve(repoRoot, ledgerPath), 'utf8'));
		if (
			!Array.isArray(ledger.permittedTransformations) ||
			ledger.permittedTransformations.length === 0
		) {
			throw new Error('runtime transformation ledger is missing permittedTransformations');
		}
		if (recordedFixtureSha256 === undefined) {
			recordedFixtureSha256 = ledger.fixtureFileSha256;
		}
	}
	const pristineCases = extractCaseAssertionContracts(pristineSource, 'pristine.ts');
	const adaptedCases = extractCaseAssertionContracts(adaptedSource, 'adapted.ts');
	const adaptedByTitle = new Map(
		adaptedCases.map(function entryOf(caseEntry) {
			return [caseEntry.title, caseEntry.contracts];
		}),
	);
	for (const pristineCase of pristineCases) {
		const adaptedContracts = adaptedByTitle.get(pristineCase.title);
		if (adaptedContracts === undefined) {
			throw new Error(
				`alien-signals runtime structure crosswalk missing adapted case: ${pristineCase.title}`,
			);
		}
		if (!contractsCovered(pristineCase.contracts, adaptedContracts)) {
			throw new Error(
				`alien-signals runtime assertion drift in "${pristineCase.title}": pristine contracts ${JSON.stringify(pristineCase.contracts)} are not covered by adapted contracts ${JSON.stringify(adaptedContracts)}`,
			);
		}
	}
	const mounted = extractMountedFixtures(adaptedSource);
	const exports = new Set(fixtureExportNames(fixtureSource));
	for (const fixtureName of mounted) {
		if (!exports.has(fixtureName)) {
			throw new Error(`alien-signals adapted suite mounts missing fixture export: ${fixtureName}`);
		}
	}
	if (mounted.length === 0) {
		throw new Error('alien-signals adapted suite must mount at least one fixture component');
	}
	const fixtureSha256 = fixtureFileFingerprint(fixtureSource);
	if (recordedFixtureSha256 && recordedFixtureSha256 !== fixtureSha256) {
		throw new Error(
			`alien-signals fixture drift in hooks.tsrx: expected sha256 ${recordedFixtureSha256} but found ${fixtureSha256}`,
		);
	}
	return {
		cases: pristineCases.length,
		fixtures: mounted.length,
		fixtureExports: exports.size,
		fixtureFileSha256: fixtureSha256,
	};
}

export function assertRuntimeCrosswalk(
	pristineInventory,
	adaptedInventory,
	{ pristineSource, adaptedSource, fixtureSource, repoRoot, expectedFixtureSha256 } = {},
) {
	const pristineBare = titlesFromInventory(pristineInventory).map(stripSuitePrefix).sort();
	const adaptedBare = titlesFromInventory(adaptedInventory).map(stripSuitePrefix).sort();
	if (JSON.stringify(pristineBare) !== JSON.stringify(adaptedBare)) {
		throw new Error(
			`alien-signals runtime inventories are not one-for-one by title: ${describeTitleMismatch(pristineBare, adaptedBare)}`,
		);
	}
	let structure = null;
	if (pristineSource && adaptedSource && fixtureSource) {
		structure = assertRuntimeStructureCrosswalk({
			pristineSource,
			adaptedSource,
			fixtureSource,
			repoRoot,
			expectedFixtureSha256,
		});
	}
	return {
		titles: pristineBare.length,
		structure,
	};
}

export function assertAdaptedSourceExecutable(source, label = 'adapted suite') {
	if (DISABLED_REGISTRATION.test(source)) {
		throw new Error(
			`${label}: adapted upstream tests must execute without focused, failing/fails, skip, or todo markers`,
		);
	}
}

export function verifyAlienSignalsRuntimeStructure(root) {
	const pristineSource = readFileSync(
		resolve(root, 'packages/alien-signals/upstream/src/index.test.ts'),
		'utf8',
	);
	const adaptedSource = readFileSync(
		resolve(root, 'packages/alien-signals/tests/upstream-adapted.test.ts'),
		'utf8',
	);
	const fixtureSource = readFileSync(
		resolve(root, 'packages/alien-signals/tests/_fixtures/hooks.tsrx'),
		'utf8',
	);
	assertAdaptedSourceExecutable(
		adaptedSource,
		'packages/alien-signals/tests/upstream-adapted.test.ts',
	);
	return assertRuntimeStructureCrosswalk({
		pristineSource,
		adaptedSource,
		fixtureSource,
		repoRoot: root,
	});
}
