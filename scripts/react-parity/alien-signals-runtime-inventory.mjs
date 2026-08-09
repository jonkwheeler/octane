#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

import {
	compareTestIdentities,
	summarizeRuntimeInventories,
	toPortablePath,
} from './harness-lib.mjs';
import {
	inventoryFromIdentities,
	runPristineUpstreamSuite,
} from './alien-signals-pristine-runtime.mjs';

const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));

function sha256Text(value) {
	return createHash('sha256').update(value).digest('hex');
}

function sha256File(path) {
	return sha256Text(readFileSync(resolve(root, path)));
}

function writeInventory(destination, inventory) {
	const absolute = resolve(root, destination);
	mkdirSync(dirname(absolute), { recursive: true });
	writeFileSync(absolute, `${JSON.stringify(inventory, null, '\t')}\n`);
	const count = Array.isArray(inventory)
		? `${inventory.length} files`
		: Array.isArray(inventory.tests)
			? `${inventory.tests.length} tests`
			: 'object';
	console.log(`${destination}: ${count}`);
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
	for (const match of source.matchAll(/\/\/\s*@ts-expect-error([^\n]*)\n\s*([^\n]+)/g)) {
		groups.push(`expect-error:${match[1].trim()}:${match[2].replace(/\s+/g, ' ').trim()}`);
	}
	function visit(node) {
		if (
			ts.isCallExpression(node) &&
			ts.isIdentifier(node.expression) &&
			node.expression.text === 'expectType'
		) {
			groups.push(
				`expectType:${printer
					.printNode(ts.EmitHint.Unspecified, node, sourceFile)
					.replace(/\s+/g, ' ')
					.trim()}`,
			);
		}
		ts.forEachChild(node, visit);
	}
	visit(sourceFile);
	return groups;
}

function typeInventoryFor(relativePath) {
	const source = readFileSync(resolve(root, relativePath), 'utf8');
	return [
		{
			path: relativePath.split('/').pop(),
			sha256: sha256Text(source),
			assertionGroups: assertionGroups(source, relativePath).map(sha256Text),
		},
	];
}

const pristine = runPristineUpstreamSuite({ repoRoot: root });
if (pristine.status !== 0) {
	process.stderr.write(pristine.stdout);
	process.stderr.write(pristine.stderr);
	throw new Error('Alien Signals pristine upstream suite failed while generating inventory');
}
writeInventory(
	'packages/alien-signals/audit/pristine-runtime.json',
	inventoryFromIdentities(pristine.identities, 'alien-signals-pristine-inner'),
);

const wrapperFullName = 'runs the pinned react-alien-signals 0.3.0 suite unchanged';
const wrapperFile = 'packages/alien-signals/tests/upstream-original.test.ts';
const wrapperInventory = {
	schemaVersion: 1,
	project: 'alien-signals-pristine',
	roots: ['packages/alien-signals/tests'],
	files: [wrapperFile],
	tests: [
		{
			id: `runtime:${sha256Text(`${wrapperFile}\0${wrapperFullName}`).slice(0, 16)}`,
			file: wrapperFile,
			fullName: wrapperFullName,
		},
	],
};
writeInventory('packages/alien-signals/audit/pristine-wrapper-runtime.json', wrapperInventory);

const adaptedFiles = ['packages/alien-signals/tests/upstream-adapted.test.ts'];
const idOccurrences = new Map();
const listed = JSON.parse(
	execFileSync(
		process.execPath,
		['node_modules/vitest/vitest.mjs', 'list', '--project', 'alien-signals', '--json'],
		{ cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 },
	),
);
const adaptedTests = listed
	.map(function mapListed(test) {
		return {
			...test,
			relativeFile: toPortablePath(relative(root, test.file)),
		};
	})
	.filter(function keepAdapted(test) {
		return adaptedFiles.includes(test.relativeFile);
	})
	.map(function toInventoryEntry(test) {
		const fullName = test.name.replaceAll(' > ', ' ');
		const baseId = `runtime:${sha256Text(`${test.relativeFile}\0${fullName}`).slice(0, 16)}`;
		const occurrence = idOccurrences.get(baseId) ?? 0;
		idOccurrences.set(baseId, occurrence + 1);
		return {
			id: occurrence === 0 ? baseId : `${baseId}:${occurrence + 1}`,
			file: test.relativeFile,
			fullName,
		};
	})
	.sort(compareTestIdentities);

const adaptedInventory = {
	schemaVersion: 1,
	project: 'alien-signals',
	roots: ['packages/alien-signals/tests'],
	files: adaptedFiles,
	tests: adaptedTests,
};
writeInventory('packages/alien-signals/audit/adapted-runtime.json', adaptedInventory);
writeInventory(
	'packages/alien-signals/audit/pristine-types.json',
	typeInventoryFor('packages/alien-signals/audit/type-probes/public-api.test-d.ts'),
);
writeInventory(
	'packages/alien-signals/audit/adapted-types.json',
	typeInventoryFor('packages/alien-signals/typetests/public-api.test-d.ts'),
);

const summary = summarizeRuntimeInventories([adaptedInventory]);
console.log('adaptedRuntimeSummary', JSON.stringify(summary));

const supportPaths = [
	'packages/alien-signals/audit/pristine-wrapper-runtime.json',
	'packages/alien-signals/audit/pristine-runtime.json',
	'packages/alien-signals/audit/adapted-runtime.json',
	'packages/alien-signals/audit/pristine-types.json',
	'packages/alien-signals/audit/adapted-types.json',
	'packages/alien-signals/audit/type-parity.json',
	'packages/alien-signals/tests/upstream-original.test.ts',
	'scripts/react-parity/alien-signals-pristine-runtime.mjs',
	'packages/alien-signals/scripts/run-pristine-upstream.mjs',
	'packages/alien-signals/scripts/verify-upstream.mjs',
	'packages/alien-signals/upstream/SHA256SUMS',
	'packages/alien-signals/audit/type-probes/public-api.test-d.ts',
	'packages/alien-signals/audit/type-probes/tsconfig.pristine.json',
	'packages/alien-signals/typetests/public-api.test-d.ts',
	'packages/alien-signals/typetests/tsconfig.json',
];
for (const path of supportPaths) {
	console.log(`${path}: ${sha256File(path)}`);
}
