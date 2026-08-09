import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';
import ts from 'typescript';

const UPSTREAM_TEST_ROOT = 'packages/react-resizable-panels/upstream/source/lib';
const PORTED_TEST_ROOT = 'packages/react-resizable-panels/tests/upstream';
const PORTED_INVENTORY_PATH = 'packages/react-resizable-panels/audit/upstream-adapted.SHA256SUMS';
const TEST_INVENTORY_PATH = 'packages/react-resizable-panels/audit/test-inventory.json';
const RUNTIME_PARITY_CONFIG = 'packages/react-resizable-panels/audit/runtime-parity.json';
const PRISTINE_RUNTIME_PATH = 'packages/react-resizable-panels/audit/pristine-runtime.json';
const ADAPTED_RUNTIME_PATH = 'packages/react-resizable-panels/audit/adapted-runtime.json';
const REACT_PARITY_MANIFEST = 'packages/react-resizable-panels/audit/react-parity.json';

const ADAPTED_PATH_OVERRIDES = new Map([
	[
		'global/utils/getImperativeGroupMethods.test.ts',
		'components/group/getImperativeGroupMethods.test.ts',
	],
	[
		'global/utils/getImperativePanelMethods.test.ts',
		'components/panel/getImperativePanelMethods.test.ts',
	],
]);

function filesBelow(root) {
	return readdirSync(root, { recursive: true, withFileTypes: true })
		.filter(function keepFiles(entry) {
			return entry.isFile();
		})
		.map(function toAbsolute(entry) {
			return resolve(entry.parentPath ?? entry.path, entry.name);
		})
		.sort();
}

function portableRelative(root, file) {
	return relative(root, file).split(sep).join('/');
}

export function adaptedRelativePath(upstreamRelative) {
	const override = ADAPTED_PATH_OVERRIDES.get(upstreamRelative);
	if (override) return override;
	return upstreamRelative.replace(/\.tsx$/, '.tsrx');
}

export function mapPristineFileToAdapted(pristineFile) {
	const prefix = `${UPSTREAM_TEST_ROOT}/`;
	if (!pristineFile.startsWith(prefix)) {
		throw new Error(`pristine runtime file is outside upstream root: ${pristineFile}`);
	}
	return `${PORTED_TEST_ROOT}/${adaptedRelativePath(pristineFile.slice(prefix.length))}`;
}

function scriptKindFor(fileName) {
	return fileName.endsWith('.tsrx') || fileName.endsWith('.tsx')
		? ts.ScriptKind.TSX
		: ts.ScriptKind.TS;
}

export function normalizeAssertionText(source) {
	return source
		.replace(/"/g, "'")
		.replace(/,(\s*[)}\]])/g, '$1')
		.replace(/\{\s+/g, '{')
		.replace(/\s+\}/g, '}')
		.replace(/\[\s+/g, '[')
		.replace(/\s+\]/g, ']')
		.replace(/\s+\./g, '.')
		.replace(/\s+/g, ' ')
		.trim();
}

function isExpectRoot(node) {
	return (
		ts.isCallExpression(node) &&
		ts.isIdentifier(node.expression) &&
		node.expression.text === 'expect'
	);
}

function outermostExpect(node) {
	let current = node;
	while (
		current.parent &&
		(ts.isPropertyAccessExpression(current.parent) ||
			ts.isCallExpression(current.parent) ||
			ts.isElementAccessExpression(current.parent))
	) {
		current = current.parent;
	}
	return current;
}

function containsExpect(node) {
	let found = false;
	function visit(child) {
		if (found) return;
		if (isExpectRoot(child)) {
			found = true;
			return;
		}
		ts.forEachChild(child, visit);
	}
	visit(node);
	return found;
}

function literalTitle(node) {
	if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
	return null;
}

function registrarTitle(call) {
	if (call.arguments.length === 0) return null;
	return literalTitle(call.arguments[0]);
}

function isDescribeCall(expression) {
	return ts.isIdentifier(expression) && expression.text === 'describe';
}

function isTestCall(expression) {
	return ts.isIdentifier(expression) && (expression.text === 'it' || expression.text === 'test');
}

function callbackBody(call) {
	for (const argument of call.arguments) {
		if (ts.isArrowFunction(argument) || ts.isFunctionExpression(argument)) {
			if (ts.isBlock(argument.body)) return argument.body;
			return null;
		}
	}
	return null;
}

function extractAssertionsFrom(node, printer, sourceFile) {
	const groups = [];
	const seen = new Set();
	function visit(child) {
		if (isExpectRoot(child)) {
			const outer = outermostExpect(child);
			if (!seen.has(outer)) {
				seen.add(outer);
				groups.push(
					normalizeAssertionText(printer.printNode(ts.EmitHint.Unspecified, outer, sourceFile)),
				);
			}
			return;
		}
		ts.forEachChild(child, visit);
	}
	visit(node);
	return groups;
}

function extractScenarioSteps(body, printer, sourceFile) {
	const steps = [];
	for (const statement of body.statements) {
		// Assertion text is compared separately per case. Any statement that
		// contains expect(...) is collapsed so permitted assertion transforms
		// and recorded divergences do not false-fail structure checks.
		if (containsExpect(statement)) {
			steps.push('__ASSERTION__');
			continue;
		}
		steps.push(
			normalizeAssertionText(printer.printNode(ts.EmitHint.Unspecified, statement, sourceFile)),
		);
	}
	return steps;
}

/**
 * Source-level case ledger keyed by Vitest-style full names (describe hierarchy + title).
 * Assertions and surrounding scenario steps are recorded per case so hierarchy drift,
 * moved assertions, and interaction-to-state-mutation edits fail closed.
 */
export function extractCaseLedger(source, fileName) {
	const sourceFile = ts.createSourceFile(
		fileName,
		source,
		ts.ScriptTarget.Latest,
		true,
		scriptKindFor(fileName),
	);
	const printer = ts.createPrinter({ removeComments: true });
	const cases = [];
	const occurrenceCounts = new Map();

	function recordCase(stack, title, body) {
		const fullName = [...stack, title].join(' ');
		const occurrenceKey = fullName;
		const occurrence = occurrenceCounts.get(occurrenceKey) ?? 0;
		occurrenceCounts.set(occurrenceKey, occurrence + 1);
		cases.push({
			fullName,
			title,
			occurrence,
			assertions: extractAssertionsFrom(body, printer, sourceFile),
			scenarioSteps: extractScenarioSteps(body, printer, sourceFile),
		});
	}

	function visit(node, stack) {
		if (ts.isCallExpression(node)) {
			const title = registrarTitle(node);
			const body = callbackBody(node);
			if (title !== null && body) {
				if (isDescribeCall(node.expression)) {
					ts.forEachChild(body, function visitDescribeChild(child) {
						visit(child, [...stack, title]);
					});
					return;
				}
				if (isTestCall(node.expression)) {
					recordCase(stack, title, body);
					return;
				}
			}
		}
		ts.forEachChild(node, function visitChild(child) {
			visit(child, stack);
		});
	}

	visit(sourceFile, []);
	return cases;
}

/** @deprecated Prefer extractCaseLedger; retained for narrow assertion-only probes. */
export function extractAssertionGroups(source, fileName) {
	return extractCaseLedger(source, fileName).flatMap(function assertionsOf(entry) {
		return entry.assertions;
	});
}

function applyJestDomAttributeTransform(text) {
	const withValue = text.replace(
		/expect\((.+?)\)\.toHaveAttribute\('([^']+)',\s*'([^']*)'\)/g,
		"expect($1.getAttribute('$2')).toBe('$3')",
	);
	const bare = withValue.replace(
		/expect\((.+?)\)\.toHaveAttribute\('([^']+)'\)/g,
		"expect($1.hasAttribute('$2')).toBe(true)",
	);
	return normalizeAssertionText(bare);
}

function applyCssomZeroTransform(text) {
	return normalizeAssertionText(
		text.replace(/\.style\.(minHeight|minWidth)\)\.toBe\('0'\)/g, ".style.$1).toBe('0px')"),
	);
}

function replaceExact(groups, from, to) {
	const fromNormalized = from.map(normalizeAssertionText);
	const toNormalized = to.map(normalizeAssertionText);
	const next = [...groups];
	for (let index = 0; index <= next.length - fromNormalized.length; index++) {
		if (
			fromNormalized.every(function matches(group, offset) {
				return next[index + offset] === group;
			})
		) {
			next.splice(index, fromNormalized.length, ...toNormalized);
			return next;
		}
	}
	throw new Error(
		`failed to locate permitted assertion transform sequence:\n${fromNormalized.join('\n')}`,
	);
}

function transformCaseAssertions(upstreamRelative, fullName, assertions) {
	let next = assertions.map(applyJestDomAttributeTransform);
	if (upstreamRelative === 'components/group/Group.test.tsx') {
		if (fullName.includes('duplicate panel ids')) {
			next = replaceExact(
				next,
				[
					"expect(() => render(<Group> <Panel id='foo'/> <Panel id='foo'/> </Group>)).toThrow('Panel ids must be unique; id 'foo' was used more than once')",
				],
				[
					"expect(captureLayoutEffectError(() => render(<Group> <Panel id='foo'/> <Panel id='foo'/> </Group>), 'Panel ids must be unique; id 'foo' was used more than once')).toBe(true)",
				],
			);
		}
		if (fullName.includes('duplicate separator ids')) {
			next = replaceExact(
				next,
				[
					"expect(() => render(<Group> <Panel id='left'/> <Separator id='foo'/> <Panel id='center'/> <Separator id='foo'/> <Panel id='right'/> </Group>)).toThrow('Separator ids must be unique; id 'foo' was used more than once')",
				],
				[
					"expect(captureLayoutEffectError(() => render(<Group> <Panel id='left'/> <Separator id='foo'/> <Panel id='center'/> <Separator id='foo'/> <Panel id='right'/> </Group>), 'Separator ids must be unique; id 'foo' was used more than once')).toBe(true)",
				],
			);
		}
	}
	if (upstreamRelative === 'components/panel/Panel.test.tsx') {
		if (
			next.some(function hasProfiler(group) {
				return group.includes('onGroupRender') || group.includes('onPanelRender');
			})
		) {
			next = replaceExact(
				next,
				[
					'expect(onGroupRender).toBeCalled()',
					'expect(onPanelRender).toBeCalled()',
					'expect(onPanelChildrenRender).toBeCalled()',
					'expect(onGroupRender).toBeCalledTimes(1)',
					'expect(onPanelRender).toBeCalled()',
					'expect(onPanelChildrenRender).not.toBeCalled()',
				],
				[
					'expect(onPanelChildrenRender).toBeCalled()',
					'expect(onPanelChildrenRender).not.toBeCalled()',
				],
			);
		}
		next = next.map(applyCssomZeroTransform);
	}
	return next;
}

const PANEL_MEMOIZATION_FULL_NAME =
	'Panel memoization Panels contents should not re-render on Group layout change';

const PANEL_MEMOIZATION_ADAPTED_STEPS = [
	'const onPanelChildrenRender = vi.fn();',
	'const groupRef = createRef<GroupImperativeHandle>();',
	'function Child() {onPanelChildrenRender(); return <div />;}',
	'setDefaultElementBounds(new DOMRect(0, 0, 100, 50));',
	"render(<Group groupRef={groupRef}> <Panel id='left'/> <Panel id='right'> <Child /> </Panel> </Group>);",
	'__ASSERTION__',
	'onPanelChildrenRender.mockReset();',
	'const api = groupRef.current;',
	'assert(api);',
	'act(() => {api.setLayout({left: 25, right: 75});});',
	'__ASSERTION__',
];

function transformCaseScenarioSteps(upstreamRelative, fullName, steps) {
	if (
		upstreamRelative === 'components/panel/Panel.test.tsx' &&
		fullName === PANEL_MEMOIZATION_FULL_NAME
	) {
		return [...PANEL_MEMOIZATION_ADAPTED_STEPS];
	}
	return steps.map(function transformStep(step) {
		if (step === '__ASSERTION__') return step;
		let next = applyJestDomAttributeTransform(step);
		if (upstreamRelative === 'components/panel/Panel.test.tsx') {
			next = applyCssomZeroTransform(next);
		}
		if (upstreamRelative === 'hooks/useMergedRefs.test.tsx') {
			next = next.replace(
				'const refObject = createRef<HTMLDivElement | null>();',
				'const refObject: {current: HTMLDivElement | null;} = {current: null};',
			);
		}
		return next;
	});
}

export function expectedAdaptedCaseLedger(upstreamRelative, upstreamSource) {
	return extractCaseLedger(upstreamSource, upstreamRelative).map(function transformCase(entry) {
		return {
			fullName: entry.fullName,
			title: entry.title,
			occurrence: entry.occurrence,
			assertions: transformCaseAssertions(upstreamRelative, entry.fullName, entry.assertions),
			scenarioSteps: transformCaseScenarioSteps(
				upstreamRelative,
				entry.fullName,
				entry.scenarioSteps,
			),
		};
	});
}

export function expectedAdaptedAssertionGroups(upstreamRelative, upstreamSource) {
	return expectedAdaptedCaseLedger(upstreamRelative, upstreamSource).flatMap(
		function assertionsOf(entry) {
			return entry.assertions;
		},
	);
}

function identityKey(file, fullName, occurrence) {
	return `${file}\0${fullName}\0${occurrence}`;
}

export function runtimeIdentityMultiset(inventory, mapFile) {
	const counts = new Map();
	const occurrences = new Map();
	for (const testCase of inventory.tests) {
		const file = mapFile(testCase.file);
		const occurrenceKey = `${file}\0${testCase.fullName}`;
		const occurrence = occurrences.get(occurrenceKey) ?? 0;
		occurrences.set(occurrenceKey, occurrence + 1);
		const key = identityKey(file, testCase.fullName, occurrence);
		counts.set(key, (counts.get(key) ?? 0) + 1);
	}
	return counts;
}

export function compareRuntimeIdentityMultisets(expected, actual) {
	const missing = [];
	const unexpected = [];
	for (const [key, count] of expected) {
		const actualCount = actual.get(key) ?? 0;
		if (actualCount < count) missing.push(key);
	}
	for (const [key, count] of actual) {
		const expectedCount = expected.get(key) ?? 0;
		if (count > expectedCount) unexpected.push(key);
	}
	return { missing: missing.sort(), unexpected: unexpected.sort() };
}

function divergedCaseIds(repoRoot) {
	const manifest = JSON.parse(readFileSync(resolve(repoRoot, REACT_PARITY_MANIFEST), 'utf8'));
	const ids = new Set();
	for (const divergence of manifest.divergences ?? []) {
		for (const caseId of divergence.caseIds ?? []) ids.add(caseId);
	}
	return ids;
}

function adaptedRuntimeCaseIdByFullName(repoRoot, adaptedFile, fullName, occurrence) {
	const inventory = JSON.parse(readFileSync(resolve(repoRoot, ADAPTED_RUNTIME_PATH), 'utf8'));
	let seen = 0;
	for (const testCase of inventory.tests) {
		if (testCase.file !== adaptedFile || testCase.fullName !== fullName) continue;
		if (seen === occurrence) return testCase.id;
		seen += 1;
	}
	return null;
}

function ledgerByKey(ledger) {
	const map = new Map();
	for (const entry of ledger) {
		map.set(identityKey('', entry.fullName, entry.occurrence), entry);
	}
	return map;
}

export function renderReactResizablePanelsAdaptedInventory(repoRoot) {
	const portedRoot = resolve(repoRoot, PORTED_TEST_ROOT);
	return `${filesBelow(portedRoot)
		.map(function lineFor(file) {
			const digest = createHash('sha256').update(readFileSync(file)).digest('hex');
			return `${digest}  ${portableRelative(portedRoot, file)}`;
		})
		.join('\n')}\n`;
}

export function verifyReactResizablePanelsUpstream(repoRoot) {
	const inventory = JSON.parse(readFileSync(resolve(repoRoot, TEST_INVENTORY_PATH), 'utf8'));
	const runtimeParity = JSON.parse(readFileSync(resolve(repoRoot, RUNTIME_PARITY_CONFIG), 'utf8'));
	if (!Array.isArray(runtimeParity.permittedTransformations)) {
		throw new Error('runtime-parity.json must declare permittedTransformations');
	}
	if (
		runtimeParity.permittedTransformations.some(function isUseIdFallback(entry) {
			return entry.kind === 'useId-fallback';
		})
	) {
		throw new Error(
			'useId fallback weakening is a recorded divergence, not a permittedTransformations entry',
		);
	}

	const pristineRuntime = JSON.parse(
		readFileSync(resolve(repoRoot, PRISTINE_RUNTIME_PATH), 'utf8'),
	);
	const adaptedRuntime = JSON.parse(readFileSync(resolve(repoRoot, ADAPTED_RUNTIME_PATH), 'utf8'));
	const expectedIdentities = runtimeIdentityMultiset(pristineRuntime, mapPristineFileToAdapted);
	const actualIdentities = runtimeIdentityMultiset(adaptedRuntime, function identity(file) {
		return file;
	});
	const identityDiff = compareRuntimeIdentityMultisets(expectedIdentities, actualIdentities);
	if (identityDiff.missing.length > 0 || identityDiff.unexpected.length > 0) {
		throw new Error(
			`pristine-runtime.json and adapted-runtime.json full-name crosswalk drifted after path mapping\nmissing: ${identityDiff.missing.join('\n')}\nunexpected: ${identityDiff.unexpected.join('\n')}`,
		);
	}

	const upstreamRoot = resolve(repoRoot, UPSTREAM_TEST_ROOT);
	const portedRoot = resolve(repoRoot, PORTED_TEST_ROOT);
	const diverged = divergedCaseIds(repoRoot);
	let upstreamCases = 0;
	let portedCases = 0;
	let assertionGroups = 0;

	for (const artifact of inventory.artifacts) {
		if (artifact.disposition !== 'adapted') {
			throw new Error(`${artifact.path}: upstream artifact must be adapted`);
		}
		const adaptedRelative = adaptedRelativePath(artifact.path);
		const expectedAdaptedPath = `tests/upstream/${adaptedRelative}`;
		if (artifact.adaptedPath !== expectedAdaptedPath) {
			throw new Error(
				`${artifact.path}: adaptedPath must be ${expectedAdaptedPath}, got ${artifact.adaptedPath}`,
			);
		}
		const adaptedFile = `${PORTED_TEST_ROOT}/${adaptedRelative}`;
		const upstreamSource = readFileSync(resolve(upstreamRoot, artifact.path), 'utf8');
		const portedSource = readFileSync(resolve(portedRoot, adaptedRelative), 'utf8');
		if (/\b(?:it|test|describe)\.(?:skip|todo|only|failing)\b/.test(portedSource)) {
			throw new Error(
				`${adaptedRelative}: adapted upstream tests must execute without focused, failing, skip, or todo markers`,
			);
		}

		const expectedLedger = expectedAdaptedCaseLedger(artifact.path, upstreamSource);
		const actualLedger = extractCaseLedger(portedSource, adaptedRelative);
		if (expectedLedger.length !== actualLedger.length) {
			throw new Error(
				`${adaptedRelative}: case count drifted from pristine (${expectedLedger.length} vs ${actualLedger.length})`,
			);
		}

		const expectedMap = ledgerByKey(expectedLedger);
		const actualMap = ledgerByKey(actualLedger);
		for (const [key, expectedCase] of expectedMap) {
			const actualCase = actualMap.get(key);
			if (!actualCase) {
				throw new Error(
					`${adaptedRelative}: missing adapted case identity "${expectedCase.fullName}" (hierarchy drift)`,
				);
			}
			const caseId = adaptedRuntimeCaseIdByFullName(
				repoRoot,
				adaptedFile,
				expectedCase.fullName,
				expectedCase.occurrence,
			);
			const caseIsDiverged = caseId !== null && diverged.has(caseId);
			if (!caseIsDiverged) {
				if (JSON.stringify(expectedCase.assertions) !== JSON.stringify(actualCase.assertions)) {
					throw new Error(
						`${adaptedRelative}: assertion groups for "${expectedCase.fullName}" differ from pristine after permitted transformations`,
					);
				}
				if (
					JSON.stringify(expectedCase.scenarioSteps) !== JSON.stringify(actualCase.scenarioSteps)
				) {
					throw new Error(
						`${adaptedRelative}: scenario structure for "${expectedCase.fullName}" differs from pristine after permitted transformations`,
					);
				}
			}
			assertionGroups += actualCase.assertions.length;
		}
		for (const [key, actualCase] of actualMap) {
			if (!expectedMap.has(key)) {
				throw new Error(
					`${adaptedRelative}: unexpected adapted case identity "${actualCase.fullName}"`,
				);
			}
		}

		const leafTitles = expectedLedger.map(function titleOf(entry) {
			return entry.title;
		});
		if (JSON.stringify([...artifact.identities]) !== JSON.stringify(leafTitles)) {
			throw new Error(`${artifact.path}: inventory identities drifted from upstream source cases`);
		}

		upstreamCases += expectedLedger.length;
		portedCases += actualLedger.length;
	}

	const expectedPortedInventory = readFileSync(resolve(repoRoot, PORTED_INVENTORY_PATH), 'utf8');
	const actualPortedInventory = renderReactResizablePanelsAdaptedInventory(repoRoot);
	if (actualPortedInventory !== expectedPortedInventory) {
		throw new Error(
			'react-resizable-panels adapted test inventory drifted; review and record the change',
		);
	}

	return {
		artifacts: inventory.artifacts.length,
		portedCases,
		upstreamCases,
		assertionGroups,
		permittedTransformations: runtimeParity.permittedTransformations.length,
		runtimeIdentities: expectedIdentities.size,
	};
}
