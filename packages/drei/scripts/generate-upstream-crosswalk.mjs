#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { format } from 'prettier';
import ts from 'typescript';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repositoryRoot = path.resolve(packageRoot, '../..');
const upstreamEntry = path.join(packageRoot, 'upstream/src/index.ts');
const output = path.join(packageRoot, 'audit/upstream-crosswalk.json');

const program = ts.createProgram([upstreamEntry], {
	allowJs: false,
	jsx: ts.JsxEmit.ReactJSX,
	module: ts.ModuleKind.NodeNext,
	moduleResolution: ts.ModuleResolutionKind.NodeNext,
	skipLibCheck: true,
	target: ts.ScriptTarget.ES2022,
});
const checker = program.getTypeChecker();
const sourceFile = program.getSourceFile(upstreamEntry);
const moduleSymbol = sourceFile && checker.getSymbolAtLocation(sourceFile);

if (!sourceFile || !moduleSymbol) throw new Error('Unable to load the pinned Drei source entry.');

const runtimeModule = await import('@react-three/drei');
const runtimeNames = new Set(
	Object.keys(runtimeModule).filter((name) => name !== 'default' && name !== '__esModule'),
);
const valueFlags =
	ts.SymbolFlags.Function |
	ts.SymbolFlags.Class |
	ts.SymbolFlags.Variable |
	ts.SymbolFlags.ValueModule |
	ts.SymbolFlags.Enum |
	ts.SymbolFlags.Value;
const typeFlags =
	ts.SymbolFlags.Interface |
	ts.SymbolFlags.TypeAlias |
	ts.SymbolFlags.TypeParameter |
	ts.SymbolFlags.Type |
	ts.SymbolFlags.NamespaceModule;

const entries = checker
	.getExportsOfModule(moduleSymbol)
	.map((exportSymbol) => {
		const symbol =
			exportSymbol.flags & ts.SymbolFlags.Alias
				? checker.getAliasedSymbol(exportSymbol)
				: exportSymbol;
		const declaration = symbol.declarations?.[0] ?? exportSymbol.declarations?.[0];
		const sourcePath = declaration
			? path
					.relative(repositoryRoot, declaration.getSourceFile().fileName)
					.split(path.sep)
					.join('/')
			: 'packages/drei/upstream/src/index.ts';
		const line = declaration
			? declaration.getSourceFile().getLineAndCharacterOfPosition(declaration.getStart()).line + 1
			: 1;
		const hasRuntime = runtimeNames.has(exportSymbol.name);
		const hasType =
			Boolean(symbol.flags & typeFlags) || (!hasRuntime && Boolean(symbol.flags & valueFlags));

		return {
			id: `export:${exportSymbol.name}`,
			name: exportSymbol.name,
			kind: hasRuntime && hasType ? 'value-and-type' : hasRuntime ? 'value' : 'type',
			source: { path: sourcePath, line },
			status: 'gap',
			implementation: null,
			evidence: [],
			divergence: null,
		};
	})
	.sort((left, right) => (left.name < right.name ? -1 : left.name > right.name ? 1 : 0));

const sourceNames = new Set(entries.map((entry) => entry.name));
const missingRuntimeNames = [...runtimeNames].filter((name) => !sourceNames.has(name)).sort();
if (missingRuntimeNames.length > 0) {
	throw new Error(
		`Pinned runtime exports are absent from the pinned source surface: ${missingRuntimeNames.join(', ')}`,
	);
}

const digest = createHash('sha256')
	.update(
		entries
			.map(({ name, kind, source }) => `${name}\t${kind}\t${source.path}:${source.line}`)
			.join('\n'),
	)
	.digest('hex');

const crosswalk = {
	schemaVersion: 1,
	upstream: {
		repository: 'https://github.com/pmndrs/drei',
		version: '10.7.7',
		commit: 'b8b99fd4ca1dfb8d821335671320512daa6efea4',
		publicEntry: 'src/index.ts',
		license: 'MIT',
	},
	policy: {
		target: 'complete-web-api',
		allowedStatuses: ['ported', 'reused', 'divergence', 'not-applicable'],
		readyRequiresZeroGaps: true,
	},
	expectedTotals: {
		runtimeExports: runtimeNames.size,
		sourceExports: entries.length,
		gaps: entries.length,
	},
	inventorySha256: digest,
	exports: entries,
};

await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, await format(JSON.stringify(crosswalk), { filepath: output }));
console.log(
	`Wrote ${entries.length} Drei exports (${runtimeNames.size} runtime) to ${path.relative(repositoryRoot, output)}.`,
);
