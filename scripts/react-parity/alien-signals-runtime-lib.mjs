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
		node,
	};
}

function normalizeReceiver(node, sourceFile) {
	if (node === undefined) return 'empty';
	if (
		ts.isStringLiteral(node) ||
		ts.isNoSubstitutionTemplateLiteral(node) ||
		(typeof ts.isNumericLiteral === 'function' && ts.isNumericLiteral(node)) ||
		node.kind === ts.SyntaxKind.TrueKeyword ||
		node.kind === ts.SyntaxKind.FalseKeyword ||
		node.kind === ts.SyntaxKind.NullKeyword
	) {
		return `literal:${node.getText(sourceFile).trim()}`;
	}
	if (
		ts.isCallExpression(node) &&
		ts.isIdentifier(node.expression) &&
		node.arguments.length === 0
	) {
		return `call:${node.expression.text}`;
	}
	if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) {
		const text = node.getText(sourceFile).replace(/\s+/g, '');
		if (text === 'result.current' || /^result\.current\[\d+\]$/.test(text)) return 'surface';
		if (text.endsWith('.textContent')) return 'surface';
	}
	if (ts.isIdentifier(node)) {
		if (node.text === 'undefined') return 'literal:undefined';
		return `id:${node.text}`;
	}
	return `expr:${node.getText(sourceFile).replace(/\s+/g, '')}`;
}

function splitContract(contract) {
	const separator = contract.indexOf('|');
	if (separator === -1) {
		return { receiver: 'legacy', matcherContract: contract };
	}
	return {
		receiver: contract.slice(0, separator),
		matcherContract: contract.slice(separator + 1),
	};
}

function receiversCompatible(pristineReceiver, adaptedReceiver) {
	if (pristineReceiver === adaptedReceiver) return true;
	if (pristineReceiver === 'legacy' || adaptedReceiver === 'legacy') return true;
	if (pristineReceiver.startsWith('call:') || adaptedReceiver.startsWith('call:')) {
		return pristineReceiver === adaptedReceiver;
	}
	if (pristineReceiver.startsWith('literal:') || adaptedReceiver.startsWith('literal:')) {
		return pristineReceiver === adaptedReceiver;
	}
	// assertion-surface: result.current may become DOM textContent or a local stopper/value id
	if (pristineReceiver === 'surface' && adaptedReceiver.startsWith('id:')) return true;
	if (pristineReceiver.startsWith('id:') && adaptedReceiver === 'surface') return true;
	if (pristineReceiver === 'surface' && adaptedReceiver === 'surface') return true;
	if (pristineReceiver.startsWith('id:') && adaptedReceiver.startsWith('id:')) {
		return pristineReceiver === adaptedReceiver;
	}
	return false;
}

const PER_CITATION = /\/\/\s*Per\s+src\/index\.test\.ts:(\d+)\s*$/;

function citationLineForCase(node, sourceFile) {
	const trivia = sourceFile.text.slice(node.getFullStart(), node.getStart(sourceFile));
	const lines = trivia.split(/\r?\n/);
	for (let index = lines.length - 1; index >= 0; index -= 1) {
		const match = lines[index].trim().match(PER_CITATION);
		if (match) return Number(match[1]);
	}
	return null;
}

export function extractPristineCaseLines(source, fileName = 'pristine.ts') {
	const sourceFile = ts.createSourceFile(
		fileName,
		source,
		ts.ScriptTarget.Latest,
		true,
		ts.ScriptKind.TS,
	);
	const byTitle = new Map();
	function visit(node) {
		const titled = callTitle(node, sourceFile);
		if (titled !== null) {
			const line =
				sourceFile.getLineAndCharacterOfPosition(titled.node.getStart(sourceFile)).line + 1;
			byTitle.set(titled.title, line);
			return;
		}
		ts.forEachChild(node, visit);
	}
	visit(sourceFile);
	return byTitle;
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
					const expectCall = assertionNode.expression.expression;
					const receiverNode =
						ts.isCallExpression(expectCall) &&
						ts.isIdentifier(expectCall.expression) &&
						expectCall.expression.text === 'expect'
							? expectCall.arguments[0]
							: undefined;
					const matcherContract = normalizeContract(
						matcher,
						evaluateLiteral(assertionNode.arguments[0], sourceFile),
					);
					contracts.push(`${normalizeReceiver(receiverNode, sourceFile)}|${matcherContract}`);
				}
				ts.forEachChild(assertionNode, visitAssertions);
			}
			visitAssertions(titled.body);
			cases.push({
				title: titled.title,
				contracts,
				citationLine: citationLineForCase(titled.node, sourceFile),
			});
			return;
		}
		ts.forEachChild(node, visit);
	}
	visit(sourceFile);
	return cases;
}

export function extractReferencedFixtureIds(adaptedSource) {
	const ids = new Set();
	for (const match of adaptedSource.matchAll(
		/\bresult\.(?:find|click)\(\s*['"]#([A-Za-z0-9_-]+)['"]\s*\)/g,
	)) {
		ids.add(match[1]);
	}
	return [...ids].sort();
}

function isResultCurrentAccess(node) {
	if (ts.isElementAccessExpression(node)) {
		return isResultCurrentAccess(node.expression);
	}
	return (
		ts.isPropertyAccessExpression(node) &&
		ts.isIdentifier(node.expression) &&
		node.expression.text === 'result' &&
		ts.isIdentifier(node.name) &&
		node.name.text === 'current'
	);
}

/**
 * SetterProbe-style lookup from an array that received an authentic
 * record-callback `.push(param)`: `setters.at(-1)` or `setters[i]`.
 */
function isRecordedSetterLookup(node, pushedArrays) {
	let arrayName = null;
	if (ts.isElementAccessExpression(node) && ts.isIdentifier(node.expression)) {
		arrayName = node.expression.text;
	} else if (
		ts.isCallExpression(node) &&
		ts.isPropertyAccessExpression(node.expression) &&
		ts.isIdentifier(node.expression.expression) &&
		ts.isIdentifier(node.expression.name) &&
		node.expression.name.text === 'at'
	) {
		arrayName = node.expression.expression.text;
	}
	return arrayName !== null && pushedArrays.has(arrayName);
}

function functionLikeOf(node) {
	if (ts.isFunctionExpression(node) || ts.isArrowFunction(node) || ts.isFunctionDeclaration(node)) {
		return node;
	}
	return null;
}

function firstParameterName(fn) {
	if (fn === null || fn.parameters.length === 0) return null;
	const name = fn.parameters[0].name;
	return ts.isIdentifier(name) ? name.text : null;
}

/**
 * Normalize `.tsrx` fixture source so TypeScript can parse the component bodies
 * as TSX (`function f() @{ … }` → `function f() { … }`).
 */
function parseFixtureSource(fixtureSource, fileName = 'hooks.tsx') {
	const normalized = fixtureSource.replace(/@\{/g, '{');
	return ts.createSourceFile(fileName, normalized, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}

function collectUseSignalSetterNames(fnBody) {
	const setters = new Set();
	function visit(node) {
		if (
			ts.isVariableDeclaration(node) &&
			node.initializer &&
			ts.isCallExpression(node.initializer) &&
			ts.isIdentifier(node.initializer.expression) &&
			node.initializer.expression.text === 'useSignal' &&
			ts.isArrayBindingPattern(node.name) &&
			node.name.elements.length >= 2
		) {
			const setterElement = node.name.elements[1];
			if (
				setterElement &&
				!ts.isOmittedExpression(setterElement) &&
				ts.isBindingElement(setterElement) &&
				ts.isIdentifier(setterElement.name)
			) {
				setters.add(setterElement.name.text);
			}
		}
		ts.forEachChild(node, visit);
	}
	visit(fnBody);
	return setters;
}

function collectHookReturnedSetterNames(fnBody) {
	const setters = collectUseSignalSetterNames(fnBody);
	function visit(node) {
		if (
			ts.isVariableDeclaration(node) &&
			node.initializer &&
			ts.isCallExpression(node.initializer) &&
			ts.isIdentifier(node.initializer.expression) &&
			node.initializer.expression.text === 'useSetSignal' &&
			ts.isIdentifier(node.name)
		) {
			setters.add(node.name.text);
		}
		ts.forEachChild(node, visit);
	}
	visit(fnBody);
	return setters;
}

function expressionCallsNamedCallee(expression, names) {
	let found = false;
	function visit(node) {
		if (found) return;
		const call = callExpressionOf(node);
		if (call !== null) {
			const root = calleeRootIdentifier(call.expression);
			if (root !== null && names.has(root)) {
				found = true;
				return;
			}
		}
		ts.forEachChild(node, visit);
	}
	visit(expression);
	return found;
}

function jsxAttributeInitializer(attribute) {
	if (attribute.initializer === undefined) return null;
	if (
		ts.isStringLiteral(attribute.initializer) ||
		ts.isNoSubstitutionTemplateLiteral(attribute.initializer)
	) {
		return attribute.initializer;
	}
	if (ts.isJsxExpression(attribute.initializer)) {
		return attribute.initializer.expression ?? null;
	}
	return null;
}

function elementIdFromJsxAttributes(attributes) {
	for (const attribute of attributes.properties) {
		if (
			!ts.isJsxAttribute(attribute) ||
			!ts.isIdentifier(attribute.name) ||
			attribute.name.text !== 'id'
		) {
			continue;
		}
		const value = jsxAttributeInitializer(attribute);
		if (
			value !== null &&
			(ts.isStringLiteral(value) || ts.isNoSubstitutionTemplateLiteral(value))
		) {
			return value.text;
		}
	}
	return null;
}

function onClickExpressionFromJsxAttributes(attributes) {
	for (const attribute of attributes.properties) {
		if (
			!ts.isJsxAttribute(attribute) ||
			!ts.isIdentifier(attribute.name) ||
			attribute.name.text !== 'onClick'
		) {
			continue;
		}
		return jsxAttributeInitializer(attribute);
	}
	return null;
}

/**
 * Fixtures that call `props.record(<useSignal setter>)` — the SetterProbe /
 * EffectAndSignal handler path. Only these may authenticate recorded setters.
 * Derived from the parsed fixture AST so comments and decoy text cannot qualify.
 */
export function extractFixturesThatRecordHookSetters(fixtureSource) {
	const names = new Set();
	if (!fixtureSource) return names;
	const sourceFile = parseFixtureSource(fixtureSource);
	for (const statement of sourceFile.statements) {
		if (
			!ts.isFunctionDeclaration(statement) ||
			statement.name === undefined ||
			statement.body === undefined
		) {
			continue;
		}
		const setters = collectUseSignalSetterNames(statement.body);
		if (setters.size === 0) continue;
		let recordsHookSetter = false;
		function visit(node) {
			if (recordsHookSetter) return;
			const call = callExpressionOf(node);
			if (
				call !== null &&
				ts.isPropertyAccessExpression(call.expression) &&
				ts.isIdentifier(call.expression.expression) &&
				call.expression.expression.text === 'props' &&
				ts.isIdentifier(call.expression.name) &&
				call.expression.name.text === 'record' &&
				call.arguments.length > 0 &&
				ts.isIdentifier(call.arguments[0]) &&
				setters.has(call.arguments[0].text)
			) {
				recordsHookSetter = true;
				return;
			}
			ts.forEachChild(node, visit);
		}
		visit(statement.body);
		if (recordsHookSetter) names.add(statement.name.text);
	}
	return names;
}

/**
 * Per-fixture element ids whose onClick handlers invoke a hook-returned setter
 * (`useSignal` / `useSetSignal`). Clicks on other ids do not count as hook-path
 * transitions.
 */
export function extractFixtureHookSetterClickIds(fixtureSource) {
	const byFixture = new Map();
	if (!fixtureSource) return byFixture;
	const sourceFile = parseFixtureSource(fixtureSource);
	for (const statement of sourceFile.statements) {
		if (
			!ts.isFunctionDeclaration(statement) ||
			statement.name === undefined ||
			statement.body === undefined
		) {
			continue;
		}
		const setters = collectHookReturnedSetterNames(statement.body);
		const ids = new Set();
		if (setters.size > 0) {
			function visit(node) {
				if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
					const id = elementIdFromJsxAttributes(node.attributes);
					const onClick = onClickExpressionFromJsxAttributes(node.attributes);
					if (id !== null && onClick !== null) {
						if (ts.isIdentifier(onClick) && setters.has(onClick.text)) {
							ids.add(id);
						} else if (expressionCallsNamedCallee(onClick, setters)) {
							ids.add(id);
						}
					}
				}
				ts.forEachChild(node, visit);
			}
			visit(statement.body);
		}
		byFixture.set(statement.name.text, ids);
	}
	return byFixture;
}

function clickSelectorId(call) {
	if (call.arguments.length === 0) return null;
	const arg = call.arguments[0];
	if (!ts.isStringLiteral(arg) && !ts.isNoSubstitutionTemplateLiteral(arg)) return null;
	const text = arg.text;
	return text.startsWith('#') ? text.slice(1) : text;
}

function mountFixtureName(call) {
	if (call.arguments.length === 0 || !ts.isIdentifier(call.arguments[0])) return null;
	return call.arguments[0].text;
}

function collectFunctionBindings(body) {
	const bindings = new Map();
	function visit(node) {
		if (ts.isFunctionDeclaration(node) && node.name) {
			bindings.set(node.name.text, node);
		}
		if (
			ts.isVariableDeclaration(node) &&
			node.name &&
			ts.isIdentifier(node.name) &&
			node.initializer
		) {
			const fn = functionLikeOf(node.initializer);
			if (fn !== null) bindings.set(node.name.text, fn);
		}
		ts.forEachChild(node, visit);
	}
	visit(body);
	return bindings;
}

function recordPropFromMount(call) {
	if (call.arguments.length < 2 || !ts.isObjectLiteralExpression(call.arguments[1])) {
		return null;
	}
	for (const prop of call.arguments[1].properties) {
		if (ts.isShorthandPropertyAssignment(prop) && prop.name.text === 'record') {
			return { kind: 'ref', name: prop.name.text };
		}
		if (
			ts.isPropertyAssignment(prop) &&
			ts.isIdentifier(prop.name) &&
			prop.name.text === 'record'
		) {
			if (ts.isIdentifier(prop.initializer)) {
				return { kind: 'ref', name: prop.initializer.text };
			}
			const fn = functionLikeOf(prop.initializer);
			if (fn !== null) return { kind: 'inline', fn };
		}
	}
	return null;
}

/**
 * Arrays that received `.push(<record-callback-param>)` inside a `record`
 * handler passed to a fixture that records the useSignal setter. Pushing the
 * source signal, a no-op, or any other value does not qualify.
 */
function collectAuthenticRecordedSetterArrays(caseBody, recordSetterFixtures) {
	const arrays = new Set();
	const bindings = collectFunctionBindings(caseBody);

	function markPushesOfParam(fn, paramName) {
		if (fn.body === undefined) return;
		function visitFn(node) {
			const call = callExpressionOf(node);
			if (
				call !== null &&
				ts.isPropertyAccessExpression(call.expression) &&
				ts.isIdentifier(call.expression.expression) &&
				ts.isIdentifier(call.expression.name) &&
				call.expression.name.text === 'push' &&
				call.arguments.length > 0 &&
				ts.isIdentifier(call.arguments[0]) &&
				call.arguments[0].text === paramName
			) {
				arrays.add(call.expression.expression.text);
			}
			ts.forEachChild(node, visitFn);
		}
		visitFn(fn.body);
	}

	function visit(node) {
		const call = callExpressionOf(node);
		if (
			call !== null &&
			ts.isIdentifier(call.expression) &&
			call.expression.text === 'mount' &&
			call.arguments[0] &&
			ts.isIdentifier(call.arguments[0]) &&
			recordSetterFixtures.has(call.arguments[0].text)
		) {
			const recordProp = recordPropFromMount(call);
			if (recordProp !== null) {
				const fn =
					recordProp.kind === 'inline' ? recordProp.fn : (bindings.get(recordProp.name) ?? null);
				const paramName = firstParameterName(fn);
				if (fn !== null && paramName !== null) markPushesOfParam(fn, paramName);
			}
		}
		ts.forEachChild(node, visit);
	}
	visit(caseBody);
	return arrays;
}

function collectBindingNames(nameNode, into) {
	if (ts.isIdentifier(nameNode)) {
		into.add(nameNode.text);
		return;
	}
	if (ts.isArrayBindingPattern(nameNode) || ts.isObjectBindingPattern(nameNode)) {
		for (const element of nameNode.elements) {
			if (ts.isBindingElement(element)) collectBindingNames(element.name, into);
		}
	}
}

function callExpressionOf(node) {
	if (ts.isCallExpression(node)) return node;
	if (typeof ts.isOptionalCallExpression === 'function' && ts.isOptionalCallExpression(node)) {
		return node;
	}
	return null;
}

function calleeRootIdentifier(expression) {
	let current = expression;
	while (
		ts.isPropertyAccessExpression(current) ||
		ts.isElementAccessExpression(current) ||
		(typeof ts.isNonNullExpression === 'function' && ts.isNonNullExpression(current)) ||
		(typeof ts.isParenthesizedExpression === 'function' && ts.isParenthesizedExpression(current))
	) {
		current = current.expression;
	}
	if (
		typeof ts.isOptionalChain === 'function' &&
		ts.isOptionalChain(current) &&
		'expression' in current
	) {
		return calleeRootIdentifier(current.expression);
	}
	return ts.isIdentifier(current) ? current.text : null;
}

/**
 * Per-case transition shape for the harness/fixture ledger rule:
 * pristine hook-surface setter writes (result.current / aliases) must remain
 * hook-path transitions in adapted (authenticated fixture clicks or recorded
 * setter calls), not silent direct createSignal writes.
 *
 * When `recordSetterFixtures` is provided, recorded-setter aliases count only
 * for arrays that received `.push(<record-callback-param>)` from a `record`
 * handler mounted on one of those fixtures.
 *
 * When `fixtureHookSetterClicks` is provided, `mountResult.click('#id')` counts
 * only when the mounted fixture's `#id` onClick invokes a hook-returned setter.
 */
export function extractCaseTransitionStructure(
	source,
	fileName = 'suite.ts',
	{ recordSetterFixtures = null, fixtureHookSetterClicks = null } = {},
) {
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
			const signalBindings = new Set();
			const hookAliases = new Set();
			const mountBindings = new Map();
			const pushedArrays =
				recordSetterFixtures === null
					? new Set()
					: collectAuthenticRecordedSetterArrays(titled.body, recordSetterFixtures);
			const recordedSetterAliases = new Set();
			let hookSurfaceWrites = 0;
			let fixtureClicks = 0;
			let directSourceWrites = 0;
			let recordedSetterWrites = 0;

			function visitBody(bodyNode) {
				if (ts.isVariableDeclaration(bodyNode) && bodyNode.initializer && bodyNode.name) {
					if (
						ts.isCallExpression(bodyNode.initializer) &&
						ts.isIdentifier(bodyNode.initializer.expression) &&
						bodyNode.initializer.expression.text === 'createSignal'
					) {
						collectBindingNames(bodyNode.name, signalBindings);
					}
					if (isResultCurrentAccess(bodyNode.initializer)) {
						collectBindingNames(bodyNode.name, hookAliases);
					}
					if (isRecordedSetterLookup(bodyNode.initializer, pushedArrays)) {
						collectBindingNames(bodyNode.name, recordedSetterAliases);
					}
					const mountCall = callExpressionOf(bodyNode.initializer);
					if (
						mountCall !== null &&
						ts.isIdentifier(mountCall.expression) &&
						mountCall.expression.text === 'mount' &&
						ts.isIdentifier(bodyNode.name)
					) {
						const fixtureName = mountFixtureName(mountCall);
						if (fixtureName !== null) mountBindings.set(bodyNode.name.text, fixtureName);
					}
				}

				const call = callExpressionOf(bodyNode);
				if (call !== null) {
					const expression = call.expression;
					if (
						ts.isPropertyAccessExpression(expression) &&
						ts.isIdentifier(expression.expression) &&
						ts.isIdentifier(expression.name) &&
						expression.name.text === 'click'
					) {
						const fixtureName = mountBindings.get(expression.expression.text);
						const selectorId = clickSelectorId(call);
						if (
							fixtureName !== undefined &&
							selectorId !== null &&
							fixtureHookSetterClicks !== null
						) {
							const authenticated = fixtureHookSetterClicks.get(fixtureName);
							if (authenticated !== undefined && authenticated.has(selectorId)) {
								fixtureClicks += 1;
							}
						}
					} else if (isResultCurrentAccess(expression) && call.arguments.length > 0) {
						hookSurfaceWrites += 1;
					} else {
						const root = calleeRootIdentifier(expression);
						if (root !== null && call.arguments.length > 0) {
							if (hookAliases.has(root)) {
								hookSurfaceWrites += 1;
							} else if (signalBindings.has(root)) {
								directSourceWrites += 1;
							} else if (recordedSetterAliases.has(root)) {
								recordedSetterWrites += 1;
							}
						}
					}
				}
				ts.forEachChild(bodyNode, visitBody);
			}
			visitBody(titled.body);
			cases.push({
				title: titled.title,
				hookSurfaceWrites,
				fixtureClicks,
				directSourceWrites,
				recordedSetterWrites,
				hookPathWrites: fixtureClicks + recordedSetterWrites,
			});
			return;
		}
		ts.forEachChild(node, visit);
	}
	visit(sourceFile);
	return cases;
}

export function assertPerCaseTransitionStructure(pristineSource, adaptedSource, fixtureSource) {
	const recordSetterFixtures = extractFixturesThatRecordHookSetters(fixtureSource ?? '');
	const fixtureHookSetterClicks = extractFixtureHookSetterClickIds(fixtureSource ?? '');
	const pristineCases = extractCaseTransitionStructure(pristineSource, 'pristine.ts');
	const adaptedCases = extractCaseTransitionStructure(adaptedSource, 'adapted.ts', {
		recordSetterFixtures,
		fixtureHookSetterClicks,
	});
	const adaptedByTitle = new Map(
		adaptedCases.map(function entryOf(caseEntry) {
			return [caseEntry.title, caseEntry];
		}),
	);
	for (const pristineCase of pristineCases) {
		if (pristineCase.hookSurfaceWrites === 0) continue;
		const adaptedCase = adaptedByTitle.get(pristineCase.title);
		if (adaptedCase === undefined) {
			throw new Error(
				`alien-signals runtime transition crosswalk missing adapted case: ${pristineCase.title}`,
			);
		}
		// Fixture clicks may batch multiple pristine setter writes (e.g. #inc-twice).
		// Reject only when the adapted case has no hook-path coverage, or pads a
		// shortfall with direct createSignal writes / incidental non-setter calls.
		const underCovered = adaptedCase.hookPathWrites < pristineCase.hookSurfaceWrites;
		const bypassed =
			adaptedCase.hookPathWrites === 0 || (underCovered && adaptedCase.directSourceWrites > 0);
		if (bypassed) {
			throw new Error(
				`alien-signals adapted case "${pristineCase.title}" bypasses ${pristineCase.hookSurfaceWrites} hook-surface transition(s) with direct source mutation (${adaptedCase.directSourceWrites} direct write(s), ${adaptedCase.fixtureClicks} fixture click(s), ${adaptedCase.recordedSetterWrites} recorded setter write(s)); keep hook-driven interactions under the transformation ledger`,
			);
		}
	}
	return {
		pristineHookSurfaceCases: pristineCases.filter(function hasHook(caseEntry) {
			return caseEntry.hookSurfaceWrites > 0;
		}).length,
	};
}

export function extractFixtureElementIds(fixtureSource) {
	const ids = new Set();
	for (const match of fixtureSource.matchAll(/\bid\s*=\s*["']([A-Za-z0-9_-]+)["']/g)) {
		ids.add(match[1]);
	}
	return [...ids].sort();
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
		const pristineParts = splitContract(pristineContract);
		const candidates = expandContract(pristineParts.matcherContract);
		const index = remaining.findIndex(function matches(adaptedContract) {
			const adaptedParts = splitContract(adaptedContract);
			if (!receiversCompatible(pristineParts.receiver, adaptedParts.receiver)) return false;
			const adaptedExpanded = expandContract(adaptedParts.matcherContract);
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
	const pristineLines = extractPristineCaseLines(pristineSource, 'pristine.ts');
	const adaptedByTitle = new Map(
		adaptedCases.map(function entryOf(caseEntry) {
			return [caseEntry.title, caseEntry];
		}),
	);
	for (const pristineCase of pristineCases) {
		const adaptedCase = adaptedByTitle.get(pristineCase.title);
		if (adaptedCase === undefined) {
			throw new Error(
				`alien-signals runtime structure crosswalk missing adapted case: ${pristineCase.title}`,
			);
		}
		if (adaptedCase.citationLine === null) {
			throw new Error(
				`alien-signals adapted case "${pristineCase.title}" is missing a // Per src/index.test.ts:<line> citation`,
			);
		}
		const expectedLine = pristineLines.get(pristineCase.title);
		if (expectedLine !== undefined && adaptedCase.citationLine !== expectedLine) {
			throw new Error(
				`alien-signals adapted case "${pristineCase.title}" cites line ${adaptedCase.citationLine} but pristine title is at line ${expectedLine}`,
			);
		}
		if (!contractsCovered(pristineCase.contracts, adaptedCase.contracts)) {
			throw new Error(
				`alien-signals runtime assertion drift in "${pristineCase.title}": pristine contracts ${JSON.stringify(pristineCase.contracts)} are not covered by adapted contracts ${JSON.stringify(adaptedCase.contracts)}`,
			);
		}
	}
	const transitions = assertPerCaseTransitionStructure(
		pristineSource,
		adaptedSource,
		fixtureSource,
	);
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
	const referencedIds = extractReferencedFixtureIds(adaptedSource);
	const fixtureIds = new Set(extractFixtureElementIds(fixtureSource));
	for (const id of referencedIds) {
		if (!fixtureIds.has(id)) {
			throw new Error(
				`alien-signals semantic fixture drift: adapted suite references #${id} missing from hooks.tsrx`,
			);
		}
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
		referencedFixtureIds: referencedIds.length,
		hookSurfaceCases: transitions.pristineHookSurfaceCases,
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
