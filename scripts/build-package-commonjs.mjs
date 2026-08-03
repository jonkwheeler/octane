import { build } from 'esbuild';
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

function isWithin(directory, candidate) {
	const path = relative(directory, candidate);
	return path === '' || (!path.startsWith(`..${sep}`) && path !== '..' && !isAbsolute(path));
}

function outputRelative(sourceRoot, sourcePath) {
	const sourceRelative = relative(sourceRoot, sourcePath);
	return sourceRelative.slice(0, -extname(sourceRelative).length) + '.cjs';
}

async function discoverGraph({ packageDir, entryPaths }) {
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
			logLevel: 'silent',
		});
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
		if (path.endsWith('.tsrx')) {
			throw new Error(
				`CommonJS publication does not support .tsrx source: ${relative(packageDir, path)}`,
			);
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

/**
 * Emit an authored JS/TS graph as per-module CommonJS without bundling package dependencies.
 */
export async function buildPackageCommonjs({
	packageDir,
	entries,
	outdir,
	sourceRoot = dirname(entries[0]),
}) {
	if (!packageDir || !Array.isArray(entries) || entries.length === 0 || !outdir) {
		throw new Error('buildPackageCommonjs requires packageDir, entries, and outdir');
	}
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
	const modules = await discoverGraph({ packageDir: absolutePackageDir, entryPaths });
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
	});

	for (const [sourcePath, module] of modules) {
		if (extname(sourcePath) === '.json') {
			if (isWithin(absoluteSourceRoot, sourcePath)) {
				const destination = join(absoluteOutdir, relative(absoluteSourceRoot, sourcePath));
				await mkdir(dirname(destination), { recursive: true });
				await cp(sourcePath, destination);
			}
			continue;
		}
		const outputPath = join(absoluteOutdir, outputRelative(absoluteSourceRoot, sourcePath));
		let output = await readFile(outputPath, 'utf8');
		for (const [specifier, dependency] of module.relativeImports) {
			const target =
				extname(dependency) === '.json'
					? isWithin(absoluteSourceRoot, dependency)
						? join(absoluteOutdir, relative(absoluteSourceRoot, dependency))
						: dependency
					: join(absoluteOutdir, outputRelative(absoluteSourceRoot, dependency));
			let rewritten = relative(dirname(outputPath), target).split(sep).join('/');
			if (!rewritten.startsWith('.')) rewritten = `./${rewritten}`;
			output = output.replaceAll(`require("${specifier}")`, `require("${rewritten}")`);
			output = output.replaceAll(`require('${specifier}')`, `require('${rewritten}')`);
		}
		await writeFile(outputPath, output);
	}

	const resultEntries = Object.fromEntries(
		entryPaths.map((entryPath, index) => [
			entries[index],
			join(outdir, outputRelative(absoluteSourceRoot, entryPath)).split(sep).join('/'),
		]),
	);
	return { entries: resultEntries, modules: sourceModules.length };
}

export async function buildPackageCommonjsSourceTree({
	packageDir = process.cwd(),
	sourceRoot = 'src',
	outdir = 'dist/cjs',
} = {}) {
	const sourceDirectory = resolve(packageDir, sourceRoot);
	const entries = (await readdir(sourceDirectory, { recursive: true }))
		.filter(
			(path) => ['.ts', '.js', '.mts', '.mjs'].includes(extname(path)) && !path.endsWith('.d.ts'),
		)
		.map((path) => join(sourceRoot, path));
	return buildPackageCommonjs({ packageDir, entries, outdir, sourceRoot });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	const result = await buildPackageCommonjsSourceTree();
	console.log(`CommonJS package graph built (${result.modules} modules)`);
}
