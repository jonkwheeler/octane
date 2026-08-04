import { build } from 'esbuild';
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { compile } from '../packages/octane/src/compiler/compile.js';

function createTsrxPlugin(cache) {
	return {
		name: 'octane-tsrx-commonjs',
		setup(build) {
			build.onLoad({ filter: /\.tsrx$/ }, async ({ path }) => {
				let compiled = cache.get(path);
				if (!compiled) {
					const source = await readFile(path, 'utf8');
					const result = compile(source, path, { dev: false, mode: 'client' });
					if (result.diagnostics?.some((diagnostic) => diagnostic.severity === 'error')) {
						throw new Error(result.diagnostics.map((diagnostic) => diagnostic.message).join('; '));
					}
					compiled = { contents: result.code, loader: 'js', resolveDir: dirname(path) };
					cache.set(path, compiled);
				}
				return compiled;
			});
		},
	};
}

function isWithin(directory, candidate) {
	const path = relative(directory, candidate);
	return path === '' || (!path.startsWith(`..${sep}`) && path !== '..' && !isAbsolute(path));
}

function outputRelative(sourceRoot, sourcePath) {
	const sourceRelative = relative(sourceRoot, sourcePath);
	return sourceRelative.slice(0, -extname(sourceRelative).length) + '.cjs';
}

async function discoverGraph({ packageDir, entryPaths, tsrxPlugin }) {
	let metadata;
	try {
		const result = await build({
			absWorkingDir: packageDir,
			entryPoints: entryPaths.map((path) => relative(packageDir, path)),
			outdir: '.commonjs-graph-noop',
			bundle: true,
			write: false,
			format: 'cjs',
			platform: 'node',
			target: 'node22',
			packages: 'external',
			metafile: true,
			plugins: [tsrxPlugin],
			logLevel: 'silent',
		});
		if (result.warnings.length > 0) {
			throw new Error(result.warnings.map((warning) => warning.text).join('; '));
		}
		metadata = result.metafile;
	} catch (error) {
		const details = (error.errors ?? [{ text: String(error) }]).map((item) => item.text).join('; ');
		throw new Error(`CommonJS graph validation failed: ${details}`);
	}
	const modules = new Map();
	for (const [input, inputMetadata] of Object.entries(metadata.inputs)) {
		const path = resolve(packageDir, input);
		if (!isWithin(packageDir, path)) {
			throw new Error(`CommonJS source escapes the package directory: ${path}`);
		}
		const relativeImports = new Map();
		for (const dependencyMetadata of inputMetadata.imports) {
			if (dependencyMetadata.external || !dependencyMetadata.original?.startsWith('.')) continue;
			const dependency = resolve(packageDir, dependencyMetadata.path);
			if (!isWithin(packageDir, dependency)) {
				throw new Error(
					`Relative import escapes the package directory: ${dependencyMetadata.original} from ${relative(packageDir, path)}`,
				);
			}
			relativeImports.set(dependencyMetadata.original, dependency);
		}
		modules.set(path, { relativeImports });
	}
	return modules;
}

function dependencyTarget({ dependency, sourceRoot, outdir }) {
	if (extname(dependency) !== '.json') {
		return join(outdir, outputRelative(sourceRoot, dependency));
	}
	if (isWithin(sourceRoot, dependency)) {
		return join(outdir, relative(sourceRoot, dependency));
	}
	return dependency;
}

/**
 * Emit an authored JS/TS graph as per-module CommonJS without bundling package dependencies.
 */
export async function buildPackageCommonjs({
	packageDir,
	entries,
	outdir,
	sourceRoot,
	callableDefault = false,
}) {
	if (!packageDir || !Array.isArray(entries) || entries.length === 0 || !outdir) {
		throw new Error('buildPackageCommonjs requires packageDir, entries, and outdir');
	}
	sourceRoot ??= dirname(entries[0]);
	const absolutePackageDir = resolve(packageDir);
	const absoluteSourceRoot = resolve(absolutePackageDir, sourceRoot);
	const absoluteOutdir = resolve(absolutePackageDir, outdir);
	if (
		!isWithin(absolutePackageDir, absoluteSourceRoot) ||
		!isWithin(absolutePackageDir, absoluteOutdir)
	) {
		throw new Error('CommonJS sourceRoot and outdir must stay inside the package directory');
	}
	if (
		isWithin(absoluteOutdir, absoluteSourceRoot) ||
		isWithin(absoluteSourceRoot, absoluteOutdir)
	) {
		throw new Error('CommonJS sourceRoot and outdir must not overlap');
	}
	const entryPaths = entries.map((entry) => resolve(absolutePackageDir, entry));
	for (const entryPath of entryPaths) {
		if (!isWithin(absolutePackageDir, entryPath)) {
			throw new Error(`CommonJS entry must stay inside the package directory: ${entryPath}`);
		}
	}
	const tsrxPlugin = createTsrxPlugin(new Map());
	const modules = await discoverGraph({ packageDir: absolutePackageDir, entryPaths, tsrxPlugin });
	const sourceModules = [...modules.keys()].filter((path) => extname(path) !== '.json');
	const outputs = new Map();
	for (const sourcePath of sourceModules) {
		const output = outputRelative(absoluteSourceRoot, sourcePath);
		if (output.startsWith(`..${sep}`) || output === '..') {
			throw new Error(
				`CommonJS source is outside sourceRoot: ${relative(absolutePackageDir, sourcePath)}`,
			);
		}
		const previous = outputs.get(output);
		if (previous) {
			throw new Error(`CommonJS sources collide at ${output}: ${previous} and ${sourcePath}`);
		}
		outputs.set(output, sourcePath);
	}

	await rm(absoluteOutdir, { recursive: true, force: true });
	await mkdir(absoluteOutdir, { recursive: true });
	await build({
		entryPoints: sourceModules,
		outdir: absoluteOutdir,
		outbase: absoluteSourceRoot,
		outExtension: { '.js': '.cjs' },
		format: 'cjs',
		platform: 'node',
		target: 'node22',
		bundle: false,
		logLevel: 'silent',
		plugins: [tsrxPlugin],
	});

	await Promise.all(
		[...modules].map(async ([sourcePath, module]) => {
			if (extname(sourcePath) === '.json') {
				if (isWithin(absoluteSourceRoot, sourcePath)) {
					const destination = join(absoluteOutdir, relative(absoluteSourceRoot, sourcePath));
					await mkdir(dirname(destination), { recursive: true });
					await cp(sourcePath, destination);
				}
				return;
			}
			const outputPath = join(absoluteOutdir, outputRelative(absoluteSourceRoot, sourcePath));
			let output = await readFile(outputPath, 'utf8');
			for (const [specifier, dependency] of module.relativeImports) {
				const target = dependencyTarget({
					dependency,
					sourceRoot: absoluteSourceRoot,
					outdir: absoluteOutdir,
				});
				let rewritten = relative(dirname(outputPath), target).split(sep).join('/');
				if (!rewritten.startsWith('.')) rewritten = `./${rewritten}`;
				output = output.replaceAll(`require("${specifier}")`, `require("${rewritten}")`);
				output = output.replaceAll(`require('${specifier}')`, `require('${rewritten}')`);
			}
			await writeFile(outputPath, output);
		}),
	);

	const resultEntries = Object.fromEntries(
		entryPaths.map((entryPath, index) => [
			entries[index],
			join(outdir, outputRelative(absoluteSourceRoot, entryPath)).split(sep).join('/'),
		]),
	);
	if (callableDefault) {
		const rootEntry = resultEntries['src/index.ts'] ?? resultEntries['src/index.js'];
		if (!rootEntry) {
			throw new Error('callable CommonJS default requires a src/index.ts or src/index.js entry');
		}
		const rootTarget = `./${relative(outdir, rootEntry).split(sep).join('/')}`;
		await writeFile(
			join(absoluteOutdir, 'root.cjs'),
			`const exported = require(${JSON.stringify(rootTarget)});\nconst root = exported.default;\nif (typeof root !== 'function') throw new TypeError('callable CommonJS default export must be a function');\nmodule.exports = Object.assign(root, exported, { default: root });\n`,
		);
		resultEntries.callableDefault = join(outdir, 'root.cjs').split(sep).join('/');
	}
	return { entries: resultEntries, modules: sourceModules.length };
}

export async function buildPackageCommonjsSourceTree({
	packageDir = process.cwd(),
	sourceRoot = 'src',
	outdir = 'dist/cjs',
} = {}) {
	const manifest = JSON.parse(await readFile(resolve(packageDir, 'package.json'), 'utf8'));
	const sourceDirectory = resolve(packageDir, sourceRoot);
	const entries = (await readdir(sourceDirectory, { recursive: true }))
		.filter(
			(path) =>
				['.ts', '.js', '.mts', '.mjs', '.tsrx'].includes(extname(path)) && !path.endsWith('.d.ts'),
		)
		.map((path) => join(sourceRoot, path));
	return buildPackageCommonjs({
		packageDir,
		entries,
		outdir,
		sourceRoot,
		callableDefault: manifest.octane?.commonjsCallableDefault === true,
	});
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	const result = await buildPackageCommonjsSourceTree();
	console.log(`CommonJS package graph built (${result.modules} modules)`);
}
