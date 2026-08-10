import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';
import ts from 'typescript';

export const TYPE_PARITY_CONFIG = 'packages/tanstack-devtools/audit/type-parity.json';

function sha256(value) {
	return createHash('sha256').update(value).digest('hex');
}

function posix(value) {
	return value.split(sep).join('/');
}

function listFiles(root) {
	return readdirSync(root, { recursive: true, withFileTypes: true })
		.filter(function keepProbeFiles(entry) {
			if (!entry.isFile()) return false;
			const relativePath = posix(
				relative(root, resolve(entry.parentPath ?? entry.path, entry.name)),
			);
			return /(?:\.test-d\.ts|\.ts)$/.test(relativePath) && !relativePath.endsWith('tsconfig.json');
		})
		.map(function toRelative(entry) {
			return posix(relative(root, resolve(entry.parentPath ?? entry.path, entry.name)));
		})
		.filter(function excludeConfigs(path) {
			return !path.includes('tsconfig');
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

function containsExpect(node) {
	if (ts.isIdentifier(node) && node.text === 'Expect') return true;
	return node.getChildren().some(containsExpect);
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
		groups.push(
			`expect-error:${match[1].trim()}:${match[2]
				.replace(/\bTanStackDevtoolsReact(Plugin|Init)\b/g, 'TanStackDevtoolsFramework$1')
				.replace(/\bTanStackDevtoolsOctane(Plugin|Init)\b/g, 'TanStackDevtoolsFramework$1')
				.replace(/\s+/g, ' ')
				.trim()}`,
		);
	}
	function visit(node) {
		if (ts.isTypeAliasDeclaration(node) && node.type && containsExpect(node.type)) {
			groups.push(
				`expect:${node.name.text}:${printer.printNode(ts.EmitHint.Unspecified, node.type, sourceFile).replace(/\s+/g, ' ').trim()}`,
			);
		}
		if (
			ts.isCallExpression(node) &&
			ts.isIdentifier(node.expression) &&
			node.expression.text === 'expectType'
		) {
			groups.push(
				`expectType:${printer
					.printNode(ts.EmitHint.Unspecified, node, sourceFile)
					.replace(/\bReactNode\b/g, 'RenderableNode')
					.replace(/\bReactElement\b/g, 'RenderableNode')
					.replace(/\bOctaneNode\b/g, 'RenderableNode')
					.replace(/\bTanStackDevtoolsReact(Plugin|Init)\b/g, 'TanStackDevtoolsFramework$1')
					.replace(/\bTanStackDevtoolsOctane(Plugin|Init)\b/g, 'TanStackDevtoolsFramework$1')
					.replace(/\s+/g, ' ')
					.trim()}`,
			);
		}
		ts.forEachChild(node, visit);
	}
	visit(sourceFile);
	return groups;
}

function normalizeSpecifier(specifier) {
	if (
		specifier === '../../upstream/package/src/index' ||
		specifier === '../../upstream/package/src/index.ts' ||
		specifier === '../src/index' ||
		specifier === '../src/index.ts' ||
		specifier === '@octanejs/tanstack-devtools' ||
		specifier === '@tanstack/react-devtools'
	) {
		return '#tanstack-devtools-public';
	}
	if (specifier === 'react' || specifier === 'octane') return '#renderable-runtime';
	return specifier;
}

function structuralSource(source, fileName) {
	let transformed = source
		.replace(/\bTanStackDevtoolsReact(Plugin|Init)\b/g, 'TanStackDevtoolsFramework$1')
		.replace(/\bTanStackDevtoolsOctane(Plugin|Init)\b/g, 'TanStackDevtoolsFramework$1')
		.replace(/\bReactNode\b/g, 'RenderableNode')
		.replace(/\bReactElement\b/g, 'RenderableNode')
		.replace(/\bOctaneNode\b/g, 'RenderableNode');
	const sourceFile = ts.createSourceFile(
		fileName,
		transformed,
		ts.ScriptTarget.Latest,
		true,
		ts.ScriptKind.TS,
	);
	const replacements = [];
	for (const statement of sourceFile.statements) {
		if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier))
			continue;
		const specifier = statement.moduleSpecifier.text;
		const normalized = normalizeSpecifier(specifier);
		if (normalized === specifier) continue;
		replacements.push({
			start: statement.moduleSpecifier.getStart(sourceFile) + 1,
			end: statement.moduleSpecifier.getEnd() - 1,
			value: normalized,
		});
	}
	for (const replacement of replacements.sort(function byStartDesc(a, b) {
		return b.start - a.start;
	})) {
		transformed = `${transformed.slice(0, replacement.start)}${replacement.value}${transformed.slice(replacement.end)}`;
	}
	const normalizedFile = ts.createSourceFile(
		fileName,
		transformed,
		ts.ScriptTarget.Latest,
		true,
		ts.ScriptKind.TS,
	);
	return ts
		.createPrinter({ removeComments: true })
		.printFile(normalizedFile)
		.replace(/\s+/g, ' ')
		.trim();
}

export function loadTypeParityConfig(root = process.cwd()) {
	return JSON.parse(readFileSync(resolve(root, TYPE_PARITY_CONFIG), 'utf8'));
}

export function buildTypeInventories(root = process.cwd()) {
	const config = loadTypeParityConfig(root);
	const upstreamRoot = resolve(root, config.upstreamRoot);
	const adaptedRoot = resolve(root, config.adaptedRoot);
	const upstreamFiles = listFiles(upstreamRoot);
	const adaptedFiles = listFiles(adaptedRoot);
	if (JSON.stringify(upstreamFiles) !== JSON.stringify(adaptedFiles)) {
		throw new Error(
			'type-test file inventories differ; every upstream type artifact needs one adapted counterpart',
		);
	}
	const upstream = [];
	const adapted = [];
	for (const file of upstreamFiles) {
		const upstreamSource = readFileSync(resolve(upstreamRoot, file), 'utf8');
		const adaptedSource = readFileSync(resolve(adaptedRoot, file), 'utf8');
		const upstreamGroups = assertionGroups(upstreamSource, file);
		const adaptedGroups = assertionGroups(adaptedSource, file);
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
	return { upstream, adapted, config };
}

export function writeTypeInventories(root = process.cwd()) {
	const { upstream, adapted, config } = buildTypeInventories(root);
	writeFileSync(
		resolve(root, config.inventories.upstream),
		`${JSON.stringify(upstream, null, '\t')}\n`,
	);
	writeFileSync(
		resolve(root, config.inventories.adapted),
		`${JSON.stringify(adapted, null, '\t')}\n`,
	);
	return { upstream, adapted, config };
}

export function verifyTypeInventories(root = process.cwd()) {
	const absoluteConfig = resolve(root, TYPE_PARITY_CONFIG);
	if (!existsSync(absoluteConfig))
		throw new Error(`missing type parity config: ${TYPE_PARITY_CONFIG}`);
	const { upstream, adapted, config } = buildTypeInventories(root);
	for (const side of ['upstream', 'adapted']) {
		const inventoryPath = resolve(root, config.inventories[side]);
		const recorded = existsSync(inventoryPath)
			? JSON.parse(readFileSync(inventoryPath, 'utf8'))
			: undefined;
		const expected = side === 'upstream' ? upstream : adapted;
		if (JSON.stringify(recorded) !== JSON.stringify(expected)) {
			throw new Error(
				`${side} type inventory drifted; review the change and regenerate its inventory`,
			);
		}
	}
	return {
		pairs: upstream.length,
		files: upstream.length,
		assertions: upstream.reduce(function sumAssertions(sum, file) {
			return sum + file.assertionGroups.length;
		}, 0),
	};
}
