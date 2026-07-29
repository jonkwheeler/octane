import path from 'node:path';
import { buildImportGraph, expandMigrationEntries } from './graph.js';
import { classifyPackageImport } from './classify.js';
import { createFinding, sortFindings } from './findings.js';

const UNSUPPORTED_REACT_APIS = new Set([
	'forwardRef',
	'createPortal',
	'useImperativeHandle',
	'useTransition',
]);
const HOST_FILENAMES = new Set(['layout.tsx', 'layout.jsx', 'page.tsx', 'page.jsx']);
const SERVER_ONLY_IMPORTS = new Set(['server-only', 'next/server', 'next/headers']);

/**
 * @typedef {{
 *   schemaVersion: 1,
 *   root: string,
 *   entries: string[],
 *   files: string[],
 *   packages: (import('./classify.js').PackageClassification & {
 *     locations: { file: string, location: import('./findings.js').SourceLocation | null }[]
 *   })[],
 *   findings: import('./findings.js').MigrationFinding[],
 *   blocked: boolean,
 *   candidateBoundaries: string[]
 * }} MigrationReport
 */

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

/** @param {any} node @returns {import('./findings.js').SourceLocation | null} */
function location(node) {
	return node?.loc?.start ? { line: node.loc.start.line, column: node.loc.start.column + 1 } : null;
}

/**
 * @param {{ root: string, entries: string[] }} input
 * @returns {MigrationReport}
 */
export function analyzeMigration({ root, entries }) {
	const projectRoot = path.resolve(root);
	const selectedEntries = expandMigrationEntries(
		entries.map((entry) => path.resolve(projectRoot, entry)),
	);
	const graph = buildImportGraph(selectedEntries);
	/** @type {import('./findings.js').MigrationFinding[]} */
	const findings = [];
	/** @type {Map<string, { file: string, location: import('./findings.js').SourceLocation | null }[]>} */
	const packageLocations = new Map();

	for (const unresolved of graph.unresolved) {
		findings.push(
			createFinding({
				code: unresolved.reason,
				severity: 'blocker',
				message:
					unresolved.reason === 'computed-import'
						? 'Computed dynamic imports cannot be proven migration-safe.'
						: `Cannot resolve ${unresolved.specifier ?? 'an imported module'}.`,
				file: unresolved.importer,
				location: unresolved.location,
				specifier: unresolved.specifier,
			}),
		);
	}

	for (const record of graph.files) {
		if (record.parseError) {
			findings.push(
				createFinding({
					code: 'parse-error',
					severity: 'blocker',
					message: record.parseError,
					file: record.file,
				}),
			);
			continue;
		}
		if (HOST_FILENAMES.has(path.basename(record.file))) {
			findings.push(
				createFinding({
					code: 'host-framework-file',
					severity: 'blocker',
					message: 'Framework route and layout files must remain owned by the host.',
					file: record.file,
				}),
			);
		}
		for (const imported of record.imports) {
			if (imported.typeOnly) continue;
			if (
				!imported.specifier ||
				imported.specifier.startsWith('.') ||
				imported.specifier.startsWith('/')
			)
				continue;
			const locations = packageLocations.get(imported.specifier) ?? [];
			locations.push({ file: record.file, location: imported.location });
			packageLocations.set(imported.specifier, locations);
		}
		if (/^\s*['"]use server['"]\s*;?/m.test(record.source)) {
			findings.push(
				createFinding({
					code: 'server-only-boundary',
					severity: 'blocker',
					message: 'Server-owned modules cannot become client-hosted Octane islands.',
					file: record.file,
				}),
			);
		}
		for (const imported of record.imports) {
			if (imported.specifier && SERVER_ONLY_IMPORTS.has(imported.specifier)) {
				findings.push(
					createFinding({
						code: 'server-only-import',
						severity: 'blocker',
						message: `${imported.specifier} cannot cross a client island boundary.`,
						file: record.file,
						location: imported.location,
						specifier: imported.specifier,
					}),
				);
			}
		}
		const reactClassBases = new Set();
		const reactNamespaces = new Set();
		for (const node of record.ast.body ?? []) {
			if (node.type === 'ImportDeclaration' && node.source?.value === 'react') {
				const incompatible = (node.specifiers ?? []).find(
					(/** @type {any} */ specifier) =>
						specifier.type === 'ImportDefaultSpecifier' ||
						specifier.type === 'ImportNamespaceSpecifier' ||
						specifier.importKind === 'type',
				);
				if (incompatible) {
					findings.push(
						createFinding({
							code: 'react-import-shape',
							severity: 'blocker',
							message:
								'React default, namespace, and mixed type imports require a manual split before conversion.',
							file: record.file,
							location: location(incompatible),
						}),
					);
				}
				for (const specifier of node.specifiers ?? []) {
					if (
						specifier.type === 'ImportDefaultSpecifier' ||
						specifier.type === 'ImportNamespaceSpecifier'
					) {
						reactNamespaces.add(specifier.local?.name);
					}
					if (specifier.type !== 'ImportSpecifier') continue;
					const importedName = specifier.imported?.name ?? specifier.imported?.value;
					if (importedName === 'Component' || importedName === 'PureComponent') {
						reactClassBases.add(specifier.local?.name);
					}
					if (UNSUPPORTED_REACT_APIS.has(importedName)) {
						findings.push(
							createFinding({
								code: 'unsupported-react-api',
								severity: 'blocker',
								message: `${importedName} requires manual migration review.`,
								file: record.file,
								location: location(specifier),
							}),
						);
					}
				}
			}
		}
		walk(record.ast, (node) => {
			const superClass = node.superClass;
			const extendsReactComponent =
				(superClass?.type === 'Identifier' && reactClassBases.has(superClass.name)) ||
				(superClass?.type === 'MemberExpression' &&
					superClass.object?.type === 'Identifier' &&
					reactNamespaces.has(superClass.object.name) &&
					superClass.property?.type === 'Identifier' &&
					(superClass.property.name === 'Component' ||
						superClass.property.name === 'PureComponent'));
			if (
				(node.type === 'ClassDeclaration' || node.type === 'ClassExpression') &&
				extendsReactComponent
			) {
				findings.push(
					createFinding({
						code: 'class-component',
						severity: 'blocker',
						message: 'Class components cannot cross the Octane island boundary.',
						file: record.file,
						location: location(node),
					}),
				);
			}
			if (
				node.type === 'JSXMemberExpression' &&
				node.property?.type === 'JSXIdentifier' &&
				node.property.name === 'Provider'
			) {
				findings.push(
					createFinding({
						code: 'provider-boundary',
						severity: 'blocker',
						message: 'React provider ownership must remain outside the migrated leaf.',
						file: record.file,
						location: location(node),
					}),
				);
			}
		});
	}

	const classificationRank = { supported: 0, candidate: 1, blocked: 2 };
	const packages = [...packageLocations]
		.map(([specifier, locations]) => {
			const classifications = locations.map(({ file }) =>
				classifyPackageImport(projectRoot, specifier, file),
			);
			const classification = classifications.reduce((mostRestrictive, current) =>
				classificationRank[current.classification] >
				classificationRank[mostRestrictive.classification]
					? current
					: mostRestrictive,
			);
			return { ...classification, locations };
		})
		.sort((left, right) => left.specifier.localeCompare(right.specifier));
	for (const dependency of packages) {
		const severity = dependency.classification === 'blocked' ? 'blocker' : 'info';
		findings.push(
			createFinding({
				code: `package-${dependency.classification}`,
				severity,
				message:
					dependency.classification === 'supported'
						? `${dependency.specifier} is supported via ${dependency.replacement}.`
						: dependency.classification === 'candidate'
							? `${dependency.specifier} has no React dependency evidence; compatibility is unproven.`
							: `${dependency.specifier} has no supported Octane binding.`,
				file: dependency.locations[0]?.file ?? null,
				location: dependency.locations[0]?.location ?? null,
				specifier: dependency.specifier,
				evidence: dependency.evidence,
			}),
		);
	}

	const normalizedFindings = sortFindings(findings);
	return {
		schemaVersion: 1,
		root: projectRoot,
		entries: selectedEntries,
		files: graph.files.map((record) => record.file),
		packages,
		findings: normalizedFindings,
		blocked: normalizedFindings.some((finding) => finding.severity === 'blocker'),
		candidateBoundaries: selectedEntries.filter((file) => !HOST_FILENAMES.has(path.basename(file))),
	};
}
