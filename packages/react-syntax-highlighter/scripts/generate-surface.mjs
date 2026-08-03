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

async function emitDeclaration(relativePath, source) {
	const target = join(outputRoot, relativePath);
	await mkdir(dirname(target), { recursive: true });
	await writeFile(target, await format(source, { filepath: target, useTabs: true }));
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

const declarationAliases = {
	'default-highlight.d.ts': "export { default } from './index.js';\n",
	'light-async.d.ts': "export { LightAsync as default } from './index.js';\n",
	'light.d.ts': "export { Light as default } from './index.js';\n",
	'prism-async-light.d.ts': "export { PrismAsyncLight as default } from './index.js';\n",
	'prism-async.d.ts': "export { PrismAsync as default } from './index.js';\n",
	'prism-light.d.ts': "export { PrismLight as default } from './index.js';\n",
	'prism.d.ts': "export { Prism as default } from './index.js';\n",
	'create-element.d.ts': "export { createElement as default } from './index.js';\n",
};

await emitDeclaration(
	'index.d.ts',
	await readFile(join(packageRoot, 'scripts', 'templates', 'index.d.ts'), 'utf8'),
);
for (const [path, source] of Object.entries(declarationAliases)) {
	await emitDeclaration(path, source);
}

for (const file of await walk(outputRoot)) {
	if (!file.endsWith('.js')) continue;
	const path = relative(outputRoot, file);
	const declarationPath = path.replace(/\.js$/, '.d.ts');
	if (path.startsWith('styles/')) {
		if (path.endsWith('/index.js')) {
			await emitDeclaration(declarationPath, await readFile(file, 'utf8'));
		} else {
			await emitDeclaration(
				declarationPath,
				"import type { CSSProperties } from 'react';\ndeclare const style: Record<string, CSSProperties>;\nexport default style;\n",
			);
		}
	} else if (path.startsWith('languages/')) {
		if (path.endsWith('/index.js')) {
			await emitDeclaration(declarationPath, await readFile(file, 'utf8'));
		} else {
			await emitDeclaration(
				declarationPath,
				'declare const language: (...args: any[]) => any;\nexport default language;\n',
			);
		}
	} else if (path.startsWith('async-languages/')) {
		await emitDeclaration(
			declarationPath,
			'declare const loaders: Record<string, (registerLanguage: (name: string, language: any) => void) => Promise<void>>;\nexport default loaders;\n',
		);
	}
}

console.log(`generated ${[...transformedModules].length + copiedModules.length} surface roots`);
