import { build } from 'esbuild';
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, extname, isAbsolute, join, relative, resolve, sep } from 'node:path';

const SOURCE_EXTENSIONS = ['.ts', '.js', '.mts', '.mjs'];
const RELATIVE_SPECIFIER =
	/(?:\bfrom\s*|\bimport\s*(?:\(\s*)?|\brequire\s*\(\s*)['"](\.{1,2}\/[^'"]+)['"]/g;

function isWithin(directory, candidate) {
	const path = relative(directory, candidate);
	return path === '' || (!path.startsWith(`..${sep}`) && path !== '..' && !isAbsolute(path));
}

async function exists(path) {
	try {
		await readFile(path);
		return true;
	} catch (error) {
		if (error?.code === 'EISDIR') return false;
		if (error?.code === 'ENOENT') return false;
		throw error;
	}
}

async function resolveRelative(importer, specifier) {
	const unresolved = resolve(dirname(importer), specifier);
	const extension = extname(unresolved);
	const candidates = extension
		? extension === '.js'
			? [unresolved, unresolved.slice(0, -3) + '.ts']
			: [unresolved]
		: [
				...SOURCE_EXTENSIONS.map((suffix) => unresolved + suffix),
				...SOURCE_EXTENSIONS.map((suffix) => join(unresolved, `index${suffix}`)),
				unresolved + '.json',
			];
	for (const candidate of candidates) {
		if (await exists(candidate)) return candidate;
	}
	throw new Error(`Could not resolve ${specifier} from ${importer}`);
}

function outputRelative(sourceRoot, sourcePath) {
	const sourceRelative = relative(sourceRoot, sourcePath);
	return sourceRelative.slice(0, -extname(sourceRelative).length) + '.cjs';
}

async function discoverGraph({ packageDir, entryPaths }) {
	const modules = new Map();
	const queue = [...entryPaths];
	while (queue.length > 0) {
		const path = queue.shift();
		if (modules.has(path)) continue;
		if (!isWithin(packageDir, path)) {
			throw new Error(`CommonJS source escapes the package directory: ${path}`);
		}
		if (path.endsWith('.tsrx')) {
			throw new Error(
				`CommonJS publication does not support .tsrx source: ${relative(packageDir, path)}`,
			);
		}
		const source = await readFile(path, 'utf8').catch((error) => {
			throw new Error(
				`Missing CommonJS source entry ${relative(packageDir, path)}: ${error.message}`,
			);
		});
		if (/\bawait\b/.test(source) && /(^|[;{}]\s*)await\b/m.test(source)) {
			throw new Error(
				`CommonJS publication does not support top-level await: ${relative(packageDir, path)}`,
			);
		}
		const relativeImports = new Map();
		for (const match of source.matchAll(RELATIVE_SPECIFIER)) {
			const unresolved = resolve(dirname(path), match[1]);
			if (!isWithin(packageDir, unresolved)) {
				throw new Error(
					`Relative import escapes the package directory: ${match[1]} from ${relative(packageDir, path)}`,
				);
			}
			const dependency = await resolveRelative(path, match[1]);
			if (!isWithin(packageDir, dependency)) {
				throw new Error(
					`Relative import escapes the package directory: ${match[1]} from ${relative(packageDir, path)}`,
				);
			}
			relativeImports.set(match[1], dependency);
			queue.push(dependency);
		}
		modules.set(path, { source, relativeImports });
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
			const destination = join(absoluteOutdir, relative(absoluteSourceRoot, sourcePath));
			await mkdir(dirname(destination), { recursive: true });
			await cp(sourcePath, destination);
			continue;
		}
		const outputPath = join(absoluteOutdir, outputRelative(absoluteSourceRoot, sourcePath));
		let output = await readFile(outputPath, 'utf8');
		for (const [specifier, dependency] of module.relativeImports) {
			const target =
				extname(dependency) === '.json'
					? join(absoluteOutdir, relative(absoluteSourceRoot, dependency))
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
