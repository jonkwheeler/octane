import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';
import ts from 'typescript';

const UPSTREAM_TEST_ROOT = 'packages/react-resizable-panels/upstream/source/lib';
const PORTED_TEST_ROOT = 'packages/react-resizable-panels/tests/upstream';
const PORTED_INVENTORY_PATH = 'packages/react-resizable-panels/audit/upstream-adapted.SHA256SUMS';
const TEST_INVENTORY_PATH = 'packages/react-resizable-panels/audit/test-inventory.json';
const RUNTIME_PARITY_CONFIG = 'packages/react-resizable-panels/audit/runtime-parity.json';

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

function adaptedRelativePath(upstreamRelative) {
	const override = ADAPTED_PATH_OVERRIDES.get(upstreamRelative);
	if (override) return override;
	return upstreamRelative.replace(/\.tsx$/, '.tsrx');
}

function registrationIdentities(source) {
	return [...source.matchAll(/\b(?:it|test)\s*\(\s*(["'])(.*?)\1/gs)].map(function titleOf(match) {
		return match[2];
	});
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

export function extractAssertionGroups(source, fileName) {
	const kind =
		fileName.endsWith('.tsrx') || fileName.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
	const sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, kind);
	const printer = ts.createPrinter({ removeComments: true });
	const groups = [];
	const seen = new Set();

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

	function visit(node) {
		if (isExpectRoot(node)) {
			const outer = outermostExpect(node);
			if (!seen.has(outer)) {
				seen.add(outer);
				groups.push(
					normalizeAssertionText(printer.printNode(ts.EmitHint.Unspecified, outer, sourceFile)),
				);
			}
		}
		ts.forEachChild(node, visit);
	}

	visit(sourceFile);
	return groups;
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

const FILE_ASSERTION_TRANSFORMS = new Map([
	[
		'components/group/Group.test.tsx',
		function transformGroupAssertions(groups) {
			let next = groups;
			next = replaceExact(
				next,
				[
					"expect(() => render(<Group> <Panel id='foo'/> <Panel id='foo'/> </Group>)).toThrow('Panel ids must be unique; id 'foo' was used more than once')",
				],
				[
					"expect(captureLayoutEffectError(() => render(<Group> <Panel id='foo'/> <Panel id='foo'/> </Group>), 'Panel ids must be unique; id 'foo' was used more than once')).toBe(true)",
				],
			);
			next = replaceExact(
				next,
				[
					"expect(() => render(<Group> <Panel id='left'/> <Separator id='foo'/> <Panel id='center'/> <Separator id='foo'/> <Panel id='right'/> </Group>)).toThrow('Separator ids must be unique; id 'foo' was used more than once')",
				],
				[
					"expect(captureLayoutEffectError(() => render(<Group> <Panel id='left'/> <Separator id='foo'/> <Panel id='center'/> <Separator id='foo'/> <Panel id='right'/> </Group>), 'Separator ids must be unique; id 'foo' was used more than once')).toBe(true)",
				],
			);
			return next;
		},
	],
	[
		'components/panel/Panel.test.tsx',
		function transformPanelAssertions(groups) {
			const withProfiler = replaceExact(
				groups,
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
			return withProfiler.map(applyCssomZeroTransform);
		},
	],
	[
		'hooks/useId.test.ts',
		function transformUseIdAssertions(groups) {
			return replaceExact(
				groups,
				["expect(result.current).toBe(':r123:')"],
				[
					'expect(result.current).toEqual(expect.any(String))',
					'expect(result.current.length).toBeGreaterThan(0)',
				],
			);
		},
	],
]);

export function expectedAdaptedAssertionGroups(upstreamRelative, upstreamSource) {
	const pristine = extractAssertionGroups(upstreamSource, upstreamRelative).map(
		applyJestDomAttributeTransform,
	);
	const fileTransform = FILE_ASSERTION_TRANSFORMS.get(upstreamRelative);
	return fileTransform ? fileTransform(pristine) : pristine;
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
	const upstreamRoot = resolve(repoRoot, UPSTREAM_TEST_ROOT);
	const portedRoot = resolve(repoRoot, PORTED_TEST_ROOT);
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
		const upstreamSource = readFileSync(resolve(upstreamRoot, artifact.path), 'utf8');
		const portedSource = readFileSync(resolve(portedRoot, adaptedRelative), 'utf8');
		if (/\b(?:it|test|describe)\.(?:skip|todo|only|failing)\b/.test(portedSource)) {
			throw new Error(
				`${adaptedRelative}: adapted upstream tests must execute without focused, failing, skip, or todo markers`,
			);
		}
		const upstreamTitles = registrationIdentities(upstreamSource);
		const portedTitles = registrationIdentities(portedSource);
		if (JSON.stringify([...portedTitles].sort()) !== JSON.stringify([...upstreamTitles].sort())) {
			throw new Error(
				`${adaptedRelative}: adapted test registrations drifted from the pinned upstream suite`,
			);
		}
		if (JSON.stringify([...artifact.identities]) !== JSON.stringify(upstreamTitles)) {
			throw new Error(`${artifact.path}: inventory identities drifted from upstream source`);
		}

		const expectedGroups = expectedAdaptedAssertionGroups(artifact.path, upstreamSource);
		const actualGroups = extractAssertionGroups(portedSource, adaptedRelative);
		if (JSON.stringify(expectedGroups) !== JSON.stringify(actualGroups)) {
			throw new Error(
				`${adaptedRelative}: assertion groups differ from pristine after permitted transformations`,
			);
		}
		assertionGroups += expectedGroups.length;
		upstreamCases += upstreamTitles.length;
		portedCases += portedTitles.length;
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
	};
}
