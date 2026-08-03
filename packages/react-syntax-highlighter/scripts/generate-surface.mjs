import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { transform } from 'esbuild';
import { format } from 'prettier';

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const upstreamRoot = join(packageRoot, 'upstream', 'src');
const outputRoot = join(packageRoot, 'src');
const transformedModules = new Set(['create-element.js', 'highlight.js']);
const copiedModules = [
	'async-languages',
	'checkForListedLanguage.js',
	'default-highlight.js',
	'index.js',
	'languages',
	'light-async.js',
	'light.js',
	'prism-async-light.js',
	'prism-async.js',
	'prism-light.js',
	'prism.js',
	'styles',
];

async function walk(path) {
	const { readdir } = await import('node:fs/promises');
	const entries = await readdir(path, { withFileTypes: true });
	const files = [];
	for (const entry of entries) {
		const child = join(path, entry.name);
		if (entry.isDirectory()) files.push(...(await walk(child)));
		else files.push(child);
	}
	return files;
}

function normalizeRelativeImports(source) {
	const relativeImports = source.replace(
		/(\b(?:from|import\s*\()\s*['"])(\.{1,2}\/[^'"]+?)(['"])/g,
		(prefix, start, specifier, end) =>
			/\.[cm]?[jt]sx?$/.test(specifier) ? prefix : `${start}${specifier}.js${end}`,
	);
	return relativeImports.replace(
		/(['"])(lowlight\/lib\/[^'"]+|highlight\.js\/lib\/languages\/[^'"]+)(['"])/g,
		'$1$2.js$3',
	);
}

async function emit(relativePath, source) {
	const target = join(outputRoot, relativePath);
	await mkdir(dirname(target), { recursive: true });
	await writeFile(
		target,
		await format(normalizeRelativeImports(source), { filepath: target, useTabs: true }),
	);
}

await rm(outputRoot, { recursive: true, force: true });

for (const modulePath of transformedModules) {
	let source = await readFile(join(upstreamRoot, modulePath), 'utf8');
	source = source.replace("import React from 'react';", "import * as React from 'octane';");
	const result = await transform(source, {
		loader: 'jsx',
		format: 'esm',
		target: 'es2022',
		jsxFactory: 'React.createElement',
		legalComments: 'inline',
	});
	await emit(modulePath, result.code);
}

for (const item of copiedModules) {
	const sourcePath = join(upstreamRoot, item);
	const files = item.endsWith('.js') ? [sourcePath] : await walk(sourcePath);
	for (const file of files) {
		await emit(relative(upstreamRoot, file), await readFile(file, 'utf8'));
	}
}

for (const alias of ['cs', 'nimrod', 'tex']) {
	await emit(
		`languages/hljs/${alias}.js`,
		`import ${alias} from "highlight.js/lib/languages/${alias}";\nexport default ${alias};\n`,
	);
}

await emit(
	'async-syntax-highlighter.js',
	await readFile(join(packageRoot, 'scripts', 'templates', 'async-syntax-highlighter.js'), 'utf8'),
);

console.log(`generated ${[...transformedModules].length + copiedModules.length} surface roots`);
