import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { transform } from 'esbuild';
import { format, resolveConfig } from 'prettier';

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const upstreamTests = join(packageRoot, 'upstream', '__tests__');
const outputTests = join(packageRoot, 'tests', 'adapted');
const outputSnapshots = join(outputTests, '__snapshots__');
const prettierConfig = (await resolveConfig(packageRoot)) ?? {};

await mkdir(outputSnapshots, { recursive: true });

for (const name of await readdir(outputTests)) {
	if (name.endsWith('.test.ts')) await rm(join(outputTests, name));
}

const testFiles = (await readdir(upstreamTests)).filter((name) => name.endsWith('.js')).sort();
for (const name of testFiles) {
	const source = await readFile(join(upstreamTests, name), 'utf8');
	const adapted = `import { expect, test, vi } from 'vitest';\n${source}`
		.replace("import React from 'react';", "import * as React from 'octane';")
		.replace(
			"import renderer from 'react-test-renderer';",
			"import renderer from '../react-test-renderer-adapter.ts';",
		)
		.replace(/from '\.\.\/src/g, "from '../../src")
		.replace(/jest\.fn\(\)/g, 'vi.fn()')
		.replace(/jest\.fn/g, 'vi.fn')
		.replace(/jest\./g, 'vi.');
	const outputName = name.replace(/\.js$/, '.test.ts');
	const compiled = await transform(adapted, {
		loader: 'jsx',
		format: 'esm',
		target: 'es2022',
		jsxFactory: 'React.createElement',
	});
	await writeFile(
		join(outputTests, outputName),
		await format(compiled.code, { ...prettierConfig, filepath: outputName }),
	);
}

console.log(`generated ${testFiles.length} one-for-one adapted upstream test files`);
