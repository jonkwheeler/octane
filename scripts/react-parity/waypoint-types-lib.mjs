import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';
import ts from 'typescript';

export const TYPE_PARITY_CONFIG = 'packages/waypoint/audit/type-parity.json';

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

function normalizeTypeText(text) {
	return text
		.replace(/\bWaypoint\.WaypointProps\b/g, 'WaypointProps')
		.replace(/\bReactNode\b/g, 'RenderableNode')
		.replace(/\bOctaneNode\b/g, 'RenderableNode')
		.replace(/\s+/g, ' ')
		.trim();
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
		groups.push(`expect-error:${match[1].trim()}:${normalizeTypeText(match[2])}`);
	}
	function visit(node) {
		if (ts.isTypeAliasDeclaration(node) && node.type && containsExpect(node.type)) {
			groups.push(
				`expect:${node.name.text}:${normalizeTypeText(
					printer.printNode(ts.EmitHint.Unspecified, node.type, sourceFile),
				)}`,
			);
		}
		if (
			ts.isCallExpression(node) &&
			ts.isIdentifier(node.expression) &&
			node.expression.text === 'expectType'
		) {
			groups.push(
				`expectType:${normalizeTypeText(
					printer.printNode(ts.EmitHint.Unspecified, node, sourceFile),
				)}`,
			);
		}
		ts.forEachChild(node, visit);
	}
	visit(sourceFile);
	return groups;
}

function normalizeSpecifier(specifier) {
	if (specifier === 'react-waypoint' || specifier === '@octanejs/waypoint') {
		return '#waypoint-public';
	}
	if (specifier === 'react' || specifier === 'octane') return '#renderable-runtime';
	return specifier;
}

function namedImportNames(statement) {
	if (!statement.importClause?.namedBindings || !ts.isNamedImports(statement.importClause.namedBindings)) {
		return null;
	}
	return statement.importClause.namedBindings.elements;
}

function structuralSource(source, fileName) {
	const sourceFile = ts.createSourceFile(
		fileName,
		source,
		ts.ScriptTarget.Latest,
		true,
		ts.ScriptKind.TS,
	);
	const replacements = [];
	for (const statement of sourceFile.statements) {
		if (ts.isTypeAliasDeclaration(statement) && statement.name.text === 'WaypointProps') {
			replacements.push({
				start: statement.getStart(sourceFile),
				end: statement.getEnd(),
				value: '',
			});
			continue;
		}
		if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) {
			continue;
		}
		const specifier = statement.moduleSpecifier.text;
		const normalized = normalizeSpecifier(specifier);
		const elements = namedImportNames(statement);
		if (elements) {
			const withoutProps = elements.filter(function keep(element) {
				return element.name.text !== 'WaypointProps';
			});
			if (withoutProps.length !== elements.length) {
				if (withoutProps.length === 0) {
					replacements.push({
						start: statement.getStart(sourceFile),
						end: statement.getEnd(),
						value: '',
					});
					continue;
				}
				const names = withoutProps
					.map(function printElement(element) {
						if (element.propertyName) {
							return `${element.propertyName.text} as ${element.name.text}`;
						}
						return element.name.text;
					})
					.join(', ');
				replacements.push({
					start: statement.getStart(sourceFile),
					end: statement.getEnd(),
					value: `import { ${names} } from '${normalized}';`,
				});
				continue;
			}
		}
		if (normalized !== specifier) {
			replacements.push({
				start: statement.moduleSpecifier.getStart(sourceFile) + 1,
				end: statement.moduleSpecifier.getEnd() - 1,
				value: normalized,
			});
		}
	}
	let transformed = source;
	for (const replacement of replacements.sort(function byStartDesc(a, b) {
		return b.start - a.start;
	})) {
		transformed = `${transformed.slice(0, replacement.start)}${replacement.value}${transformed.slice(replacement.end)}`;
	}
	transformed = transformed
		.replace(/\bWaypoint\.WaypointProps\b/g, 'WaypointProps')
		.replace(/\bReactNode\b/g, 'RenderableNode')
		.replace(/\bOctaneNode\b/g, 'RenderableNode');
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

export function buildTypeInventory(root, config) {
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
	return { upstream, adapted };
}

export function verifyWaypointTypes(root, { configPath = TYPE_PARITY_CONFIG } = {}) {
	const absoluteConfig = resolve(root, configPath);
	if (!existsSync(absoluteConfig)) throw new Error(`missing type parity config: ${configPath}`);
	const config = JSON.parse(readFileSync(absoluteConfig, 'utf8'));
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
		assertions: inventory.upstream.reduce(function sumAssertions(sum, file) {
			return sum + file.assertionGroups.length;
		}, 0),
	};
}

export function renderTypeInventories(root, configPath = TYPE_PARITY_CONFIG) {
	const config = JSON.parse(readFileSync(resolve(root, configPath), 'utf8'));
	const inventory = buildTypeInventory(root, config);
	return { config, inventory };
}
