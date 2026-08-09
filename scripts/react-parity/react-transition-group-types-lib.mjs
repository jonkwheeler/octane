import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';
import ts from 'typescript';

export const TYPE_PARITY_CONFIG = 'packages/react-transition-group/audit/type-parity.json';

function sha256(value) {
	return createHash('sha256').update(value).digest('hex');
}

function posix(value) {
	return value.split(sep).join('/');
}

function listProbeFiles(root) {
	return readdirSync(root, { recursive: true, withFileTypes: true })
		.filter(function keepProbes(entry) {
			return entry.isFile() && entry.name.endsWith('.test-d.ts');
		})
		.map(function toRelative(entry) {
			return posix(relative(root, resolve(entry.parentPath ?? entry.path, entry.name)));
		})
		.sort();
}

function normalizeComment(comment) {
	return comment
		.replace(/^\/\*\*|\*\/$/g, '')
		.replace(/^\s*\*\s?/gm, '')
		.replace(/\s+/g, ' ')
		.trim();
}

function containsExpectType(node) {
	if (ts.isIdentifier(node) && node.text === 'expectType') return true;
	return node.getChildren().some(containsExpectType);
}

function assertionGroups(source, fileName) {
	const sourceFile = ts.createSourceFile(
		fileName,
		source,
		ts.ScriptTarget.Latest,
		true,
		ts.ScriptKind.TS,
	);
	const printer = ts.createPrinter({ removeComments: true });
	const groups = [];
	for (const match of source.matchAll(/\/\*\*[\s\S]*?\*\//g)) {
		groups.push(`doc:${normalizeComment(match[0])}`);
	}
	for (const match of source.matchAll(/\/\/\s*@ts-expect-error([^\n]*)\n\s*([^\n]+)/g)) {
		groups.push(`expect-error:${match[1].trim()}:${match[2].replace(/\s+/g, ' ').trim()}`);
	}
	function visit(node) {
		if (ts.isCallExpression(node) && containsExpectType(node.expression)) {
			const typeArgs = (node.typeArguments ?? [])
				.map(function printType(typeNode) {
					return printer
						.printNode(ts.EmitHint.Unspecified, typeNode, sourceFile)
						.replace(/\s+/g, ' ')
						.trim();
				})
				.join(',');
			const args = node.arguments
				.map(function printArg(arg) {
					return printer
						.printNode(ts.EmitHint.Unspecified, arg, sourceFile)
						.replace(/\s+/g, ' ')
						.trim();
				})
				.join(',');
			groups.push(`expect:${typeArgs}:${args}`);
		}
		ts.forEachChild(node, visit);
	}
	visit(sourceFile);
	return groups;
}

function structuralSource(source, fileName) {
	let normalized = source
		.replace(/from ['"]react-transition-group(?:\/[^'"]+)?['"]/g, "from 'CANONICAL_RTG'")
		.replace(/from ['"]\.\.\/src\/(?:types|index)\.ts['"]/g, "from 'CANONICAL_RTG'");
	normalized = normalized.replace(
		/import type \{[^}]+\} from 'CANONICAL_RTG';\n?/g,
		"import type { CanonicalTypes } from 'CANONICAL_RTG';\n",
	);
	normalized = normalized.replace(
		/import \{[\s\S]*?\} from 'CANONICAL_RTG';/g,
		"import { CanonicalValues } from 'CANONICAL_RTG';",
	);
	normalized = normalized.replace(
		/(import type \{ CanonicalTypes \} from 'CANONICAL_RTG';\n)+/g,
		"import type { CanonicalTypes } from 'CANONICAL_RTG';\n",
	);
	const sourceFile = ts.createSourceFile(
		fileName,
		normalized,
		ts.ScriptTarget.Latest,
		true,
		ts.ScriptKind.TS,
	);
	return ts
		.createPrinter({ removeComments: true })
		.printFile(sourceFile)
		.replace(/\s+/g, ' ')
		.trim();
}

function normalizeAssertionGroup(group) {
	return group.replace(/\bReactNode\b/g, 'OctaneNode');
}

export function buildTypeInventory(root, config) {
	const upstreamRoot = resolve(root, config.upstreamRoot);
	const adaptedRoot = resolve(root, config.adaptedRoot);
	const upstreamFiles = listProbeFiles(upstreamRoot);
	const adaptedFiles = listProbeFiles(adaptedRoot);
	if (JSON.stringify(upstreamFiles) !== JSON.stringify(adaptedFiles)) {
		throw new Error(
			'type-test file inventories differ; every pristine type probe needs one adapted counterpart',
		);
	}
	const upstream = [];
	const adapted = [];
	for (const file of upstreamFiles) {
		const upstreamSource = readFileSync(resolve(upstreamRoot, file), 'utf8');
		const adaptedSource = readFileSync(resolve(adaptedRoot, file), 'utf8');
		const upstreamGroups = assertionGroups(upstreamSource, file).map(normalizeAssertionGroup);
		const adaptedGroups = assertionGroups(adaptedSource, file).map(normalizeAssertionGroup);
		if (JSON.stringify(upstreamGroups) !== JSON.stringify(adaptedGroups)) {
			throw new Error(`${file}: assertion groups differ between pristine and adapted type suites`);
		}
		if (structuralSource(upstreamSource, file) !== structuralSource(adaptedSource, file)) {
			throw new Error(
				`${file}: adapted type test contains a change outside the permitted transformations`,
			);
		}
		upstream.push({
			path: file,
			sha256: sha256(upstreamSource),
			assertionGroups: upstreamGroups.map(sha256),
		});
		adapted.push({
			path: file,
			sha256: sha256(adaptedSource),
			assertionGroups: adaptedGroups.map(sha256),
		});
	}
	return { upstream, adapted };
}

export function verifyReactTransitionGroupTypes(root, { configPath = TYPE_PARITY_CONFIG } = {}) {
	const absoluteConfig = resolve(root, configPath);
	if (!existsSync(absoluteConfig)) throw new Error(`missing type parity config: ${configPath}`);
	const config = JSON.parse(readFileSync(absoluteConfig, 'utf8'));
	if (
		!Array.isArray(config.permittedTransformations) ||
		config.permittedTransformations.length === 0
	) {
		throw new Error('type-parity.json must declare permittedTransformations');
	}
	const inventory = buildTypeInventory(root, config);
	for (const side of ['upstream', 'adapted']) {
		const inventoryPath = resolve(root, config.inventories[side]);
		const recorded = existsSync(inventoryPath)
			? JSON.parse(readFileSync(inventoryPath, 'utf8'))
			: undefined;
		if (JSON.stringify(recorded) !== JSON.stringify(inventory[side])) {
			throw new Error(
				`${side} type inventory drifted; review the change and regenerate its inventory`,
			);
		}
	}
	return {
		files: inventory.upstream.length,
		assertions: inventory.upstream.reduce(function sum(total, file) {
			return total + file.assertionGroups.length;
		}, 0),
	};
}

export function renderTypeInventories(root, configPath = TYPE_PARITY_CONFIG) {
	const config = JSON.parse(readFileSync(resolve(root, configPath), 'utf8'));
	const inventory = buildTypeInventory(root, config);
	return { config, inventory };
}
