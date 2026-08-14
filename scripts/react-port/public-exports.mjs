#!/usr/bin/env node

import { existsSync, readFileSync, realpathSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

function exportTargets(value, keyPath = 'exports') {
	if (typeof value === 'string') return [{ keyPath, target: value }];
	if (Array.isArray(value)) {
		return value.flatMap((nested, index) => exportTargets(nested, `${keyPath}[${index}]`));
	}
	if (!value || typeof value !== 'object') return [];
	return Object.entries(value).flatMap(([key, nested]) =>
		exportTargets(nested, `${keyPath}.${key}`),
	);
}

function hasPublicModuleExport(targetPath, source) {
	if (targetPath.endsWith('.json')) {
		const value = JSON.parse(source);
		return value !== null && (typeof value !== 'object' || Object.keys(value).length > 0);
	}
	if (!/\.(?:[cm]?[jt]sx?|tsrx)$/i.test(targetPath)) return source.trim().length > 0;
	const sourceFile = ts.createSourceFile(
		targetPath,
		source,
		ts.ScriptTarget.Latest,
		true,
		ts.ScriptKind.TSX,
	);
	for (const statement of sourceFile.statements) {
		if (ts.isExportAssignment(statement)) return true;
		if (ts.isExportDeclaration(statement)) {
			if (!statement.exportClause) return true;
			if (ts.isNamespaceExport(statement.exportClause)) return true;
			if (statement.exportClause.elements.length > 0) return true;
		}
		if (
			ts.canHaveModifiers(statement) &&
			ts.getModifiers(statement)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)
		) {
			return true;
		}
	}
	return false;
}

export function inspectPublicExports(packageDirectory) {
	const resolvedPackageDirectory = realpathSync(packageDirectory);
	const manifestPath = path.join(resolvedPackageDirectory, 'package.json');
	const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
	const targets = exportTargets(manifest.exports);
	if (targets.length === 0) throw new Error('Package exports must declare at least one target');
	for (const { keyPath, target } of targets) {
		if (!target.startsWith('./')) {
			throw new Error(`${keyPath} must use a package-relative target: ${target}`);
		}
		const targetPath = path.resolve(resolvedPackageDirectory, target);
		const relativeTarget = path.relative(resolvedPackageDirectory, targetPath);
		if (relativeTarget.startsWith('..') || path.isAbsolute(relativeTarget)) {
			throw new Error(`${keyPath} escapes the package directory: ${target}`);
		}
		if (!existsSync(targetPath) || !statSync(targetPath).isFile()) {
			throw new Error(`${keyPath} points to a missing public export: ${target}`);
		}
		if (realpathSync(targetPath) !== targetPath) {
			throw new Error(`${keyPath} must not resolve through a symlink: ${target}`);
		}
		if (!hasPublicModuleExport(targetPath, readFileSync(targetPath, 'utf8'))) {
			throw new Error(`${keyPath} target exports no public values or types: ${target}`);
		}
	}
	return { status: 'passed', package: manifest.name, targets };
}

function parseArguments(arguments_) {
	if (arguments_.length !== 2 || arguments_[0] !== '--package-dir' || !arguments_[1]) {
		throw new Error('Usage: node scripts/react-port/public-exports.mjs --package-dir <path>');
	}
	return arguments_[1];
}

const isMain =
	process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url));
if (isMain) {
	try {
		const report = inspectPublicExports(parseArguments(process.argv.slice(2)));
		process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
	} catch (error) {
		process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
		process.exitCode = 2;
	}
}
