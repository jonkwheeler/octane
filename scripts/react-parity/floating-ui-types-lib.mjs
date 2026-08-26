#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

export const FLOATING_UI_TYPE_PARITY_CONFIG = 'packages/floating-ui/audit/type-parity.json';

function sha256(value) {
	return createHash('sha256').update(value).digest('hex');
}

function assertionGroups(source, fileName) {
	const sourceFile = ts.createSourceFile(
		fileName,
		source,
		ts.ScriptTarget.Latest,
		true,
		ts.ScriptKind.TSX,
	);
	const declarations = new Set(
		sourceFile.statements
			.filter(ts.isFunctionDeclaration)
			.flatMap((statement) => (statement.name ? [statement.name.text] : [])),
	);
	const groups = sourceFile.statements.flatMap((statement) => {
		if (
			ts.isExpressionStatement(statement) &&
			ts.isIdentifier(statement.expression) &&
			declarations.has(statement.expression.text)
		) {
			return [`program:${statement.expression.text}`];
		}
		return [];
	});
	for (const match of source.matchAll(/\/\/\s*@ts-expect-error([^\n]*)\n\s*([^\n]+)/g)) {
		groups.push(`expect-error:${match[1].trim()}:${match[2].replace(/\s+/g, ' ').trim()}`);
	}
	return groups;
}

function normalizePermittedTransformations(source) {
	return source
		.replace(/from 'react'/g, "from '#framework'")
		.replace(/from 'octane'/g, "from '#framework'")
		.replace(/from '\.\.\/src'/g, "from '#floating-ui-public'")
		.replace(/from '\.\.\/\.\.\/src'/g, "from '#floating-ui-public'")
		.replace(/React\.useRef<(HTML(?:Div|Button)Element) \| null>/g, 'React.useRef<$1>');
}

function structuralSource(source, fileName) {
	const normalized = normalizePermittedTransformations(source);
	const sourceFile = ts.createSourceFile(
		fileName,
		normalized,
		ts.ScriptTarget.Latest,
		true,
		ts.ScriptKind.TSX,
	);
	return ts
		.createPrinter({ removeComments: true, newLine: ts.NewLineKind.LineFeed })
		.printFile(sourceFile)
		.replace(/\s+/g, ' ')
		.trim();
}

export function compareFloatingUiTypeSources(pristineSource, adaptedSource) {
	const pristineGroups = assertionGroups(pristineSource, 'pristine.tsx');
	const adaptedGroups = assertionGroups(adaptedSource, 'adapted.tsx');
	if (JSON.stringify(pristineGroups) !== JSON.stringify(adaptedGroups)) {
		throw new Error('floating-ui type assertion groups differ between pristine and adapted suites');
	}
	if (
		structuralSource(pristineSource, 'pristine.tsx') !==
		structuralSource(adaptedSource, 'adapted.tsx')
	) {
		throw new Error(
			'floating-ui adapted type program contains a change outside the permitted transformations',
		);
	}
	return pristineGroups;
}

function readConfig(repoRoot, configPath) {
	const absolute = resolve(repoRoot, configPath);
	if (!existsSync(absolute))
		throw new Error(`missing floating-ui type parity config: ${configPath}`);
	const config = JSON.parse(readFileSync(absolute, 'utf8'));
	if (
		!Array.isArray(config.permittedTransformations) ||
		config.permittedTransformations.length === 0
	) {
		throw new Error('floating-ui type parity must declare its permitted transformations');
	}
	return config;
}

export function buildFloatingUiTypeInventories(
	repoRoot,
	configPath = FLOATING_UI_TYPE_PARITY_CONFIG,
) {
	const config = readConfig(repoRoot, configPath);
	const pristineSource = readFileSync(resolve(repoRoot, config.pristineFile), 'utf8');
	const adaptedSource = readFileSync(resolve(repoRoot, config.adaptedFile), 'utf8');
	const groups = compareFloatingUiTypeSources(pristineSource, adaptedSource);
	return {
		config,
		pristine: {
			path: config.pristineFile,
			sha256: sha256(pristineSource),
			assertionGroups: groups.map(sha256),
		},
		adapted: {
			path: config.adaptedFile,
			sha256: sha256(adaptedSource),
			assertionGroups: groups.map(sha256),
		},
	};
}

export function verifyFloatingUiTypes(repoRoot, options = {}) {
	const result = buildFloatingUiTypeInventories(
		repoRoot,
		options.configPath ?? FLOATING_UI_TYPE_PARITY_CONFIG,
	);
	for (const side of ['pristine', 'adapted']) {
		const path = result.config.inventories[side];
		const recorded = JSON.parse(readFileSync(resolve(repoRoot, path), 'utf8'));
		if (JSON.stringify(recorded) !== JSON.stringify(result[side])) {
			throw new Error(`${side} floating-ui type inventory drifted; regenerate it after review`);
		}
	}
	return { files: 2, assertions: result.pristine.assertionGroups.length };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	const repoRoot = resolve(import.meta.dirname, '../..');
	const result = buildFloatingUiTypeInventories(repoRoot);
	if (!process.argv.includes('--write')) {
		verifyFloatingUiTypes(repoRoot);
		console.log(
			`Floating UI upstream types: ${result.pristine.assertionGroups.length} paired groups.`,
		);
	} else {
		for (const side of ['pristine', 'adapted']) {
			writeFileSync(
				resolve(repoRoot, result.config.inventories[side]),
				`${JSON.stringify(result[side], null, 2)}\n`,
			);
		}
		console.log(
			`Wrote Floating UI type inventories (${result.pristine.assertionGroups.length} groups).`,
		);
	}
}
