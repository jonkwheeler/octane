import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';
import ts from 'typescript';

export const TYPE_PARITY_CONFIG = 'packages/react-popper/audit/type-parity.json';

const PAIRED_FILES = ['main-test.tsx', 'svg-test.tsx'];

function sha256(value) {
	return createHash('sha256').update(value).digest('hex');
}

function posix(value) {
	return value.split(sep).join('/');
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

export function assertionGroups(source, fileName) {
	const sourceFile = ts.createSourceFile(
		fileName,
		source,
		ts.ScriptTarget.Latest,
		true,
		ts.ScriptKind.TSX,
	);
	const printer = ts.createPrinter({ removeComments: true });
	const groups = [];
	for (const match of source.matchAll(/\/\*\*[\s\S]*?\*\//g)) {
		const text = normalizeComment(match[0]);
		if (text.includes('@jsxImportSource')) continue;
		groups.push(`doc:${text}`);
	}
	for (const match of source.matchAll(/\/\/\s*@ts-expect-error([^\n]*)\n\s*([^\n]+)/g)) {
		groups.push(`expect-error:${match[1].trim()}:${match[2].replace(/\s+/g, ' ').trim()}`);
	}
	function visit(node) {
		if (ts.isTypeAliasDeclaration(node) && node.type && containsExpect(node.type)) {
			groups.push(
				`expect:${node.name.text}:${printer.printNode(ts.EmitHint.Unspecified, node.type, sourceFile).replace(/\s+/g, ' ').trim()}`,
			);
		}
		ts.forEachChild(node, visit);
	}
	visit(sourceFile);
	return groups;
}

function normalizeSpecifier(specifier) {
	if (
		specifier === '../..' ||
		specifier === '@octanejs/react-popper' ||
		specifier === 'react-popper'
	) {
		return '#react-popper';
	}
	if (specifier === 'react' || specifier === 'octane') return '#renderable-runtime';
	return specifier;
}

export function structuralSource(source, fileName) {
	let transformed = source
		.replace(/^\/\*\*\s*@jsxImportSource\s+octane\s*\*\/\s*/m, '')
		.replace(/\bReact\.useState\b/g, 'useState');
	const sourceFile = ts.createSourceFile(
		fileName,
		transformed,
		ts.ScriptTarget.Latest,
		true,
		ts.ScriptKind.TSX,
	);
	const dropRanges = [];
	for (const statement of sourceFile.statements) {
		if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier))
			continue;
		const specifier = statement.moduleSpecifier.text;
		if (specifier === 'react' || specifier === 'octane') {
			dropRanges.push({
				start: statement.getFullStart(),
				end: statement.getEnd(),
			});
		}
	}
	for (const range of dropRanges.sort(function byStartDesc(a, b) {
		return b.start - a.start;
	})) {
		transformed = `${transformed.slice(0, range.start)}${transformed.slice(range.end)}`;
	}
	const afterDrop = ts.createSourceFile(
		fileName,
		transformed,
		ts.ScriptTarget.Latest,
		true,
		ts.ScriptKind.TSX,
	);
	const rewrite = [];
	for (const statement of afterDrop.statements) {
		if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier))
			continue;
		const specifier = statement.moduleSpecifier.text;
		const normalized = normalizeSpecifier(specifier);
		if (normalized === specifier) continue;
		rewrite.push({
			start: statement.moduleSpecifier.getStart(afterDrop) + 1,
			end: statement.moduleSpecifier.getEnd() - 1,
			value: normalized,
		});
	}
	for (const replacement of rewrite.sort(function byStartDesc(a, b) {
		return b.start - a.start;
	})) {
		transformed = `${transformed.slice(0, replacement.start)}${replacement.value}${transformed.slice(replacement.end)}`;
	}
	const normalizedFile = ts.createSourceFile(
		fileName,
		transformed,
		ts.ScriptTarget.Latest,
		true,
		ts.ScriptKind.TSX,
	);
	return ts
		.createPrinter({ removeComments: true })
		.printFile(normalizedFile)
		.replace(/\s+/g, ' ')
		.trim();
}

function listPairedFiles(rootDir) {
	const present = new Set(
		readdirSync(rootDir, { recursive: true, withFileTypes: true })
			.filter(function keepFiles(entry) {
				return entry.isFile();
			})
			.map(function toRelative(entry) {
				return posix(relative(rootDir, resolve(entry.parentPath ?? entry.path, entry.name)));
			}),
	);
	for (const file of PAIRED_FILES) {
		if (!present.has(file)) throw new Error(`missing type-test file ${file} under ${rootDir}`);
	}
	return PAIRED_FILES.slice();
}

export function buildTypeInventory(root, config) {
	const upstreamRoot = resolve(root, config.upstreamRoot);
	const adaptedRoot = resolve(root, config.adaptedRoot);
	const files = listPairedFiles(upstreamRoot);
	listPairedFiles(adaptedRoot);
	const upstream = [];
	const adapted = [];
	for (const file of files) {
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
	const adaptedOnly = [];
	for (const entry of config.adaptedOnly ?? []) {
		const source = readFileSync(resolve(root, entry.path), 'utf8');
		const groups = assertionGroups(source, entry.path);
		if (
			!groups.some(function hasExpectError(group) {
				return group.startsWith('expect-error:');
			})
		) {
			throw new Error(
				`${entry.path}: adapted-only type evidence requires @ts-expect-error controls`,
			);
		}
		adaptedOnly.push({
			path: entry.path,
			sha256: sha256(source),
			assertionGroups: groups.map(sha256),
			rationale: entry.rationale,
		});
	}
	return { upstream, adapted, adaptedOnly };
}

export function verifyReactPopperTypes(root, { configPath = TYPE_PARITY_CONFIG } = {}) {
	const absoluteConfig = resolve(root, configPath);
	if (!existsSync(absoluteConfig)) throw new Error(`missing type parity config: ${configPath}`);
	const config = JSON.parse(readFileSync(absoluteConfig, 'utf8'));
	if (
		!Array.isArray(config.permittedTransformations) ||
		config.permittedTransformations.length === 0
	) {
		throw new Error('type-parity.json must record permittedTransformations');
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
	if (config.inventories.adaptedOnly) {
		const inventoryPath = resolve(root, config.inventories.adaptedOnly);
		const recorded = existsSync(inventoryPath)
			? JSON.parse(readFileSync(inventoryPath, 'utf8'))
			: undefined;
		if (JSON.stringify(recorded) !== JSON.stringify(inventory.adaptedOnly)) {
			throw new Error(
				'adapted-only type inventory drifted; review the change and regenerate its inventory',
			);
		}
	}
	return {
		files: inventory.upstream.length,
		assertions: inventory.upstream.reduce(function sum(sum, file) {
			return sum + file.assertionGroups.length;
		}, 0),
		adaptedOnly: inventory.adaptedOnly.length,
	};
}

export function renderTypeInventories(root, configPath = TYPE_PARITY_CONFIG) {
	const config = JSON.parse(readFileSync(resolve(root, configPath), 'utf8'));
	const inventory = buildTypeInventory(root, config);
	return { config, inventory };
}
