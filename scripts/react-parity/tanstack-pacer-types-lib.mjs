import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';

export const TYPE_PARITY_CONFIG = 'packages/tanstack-pacer/audit/type-parity.json';

function sha256(value) {
	return createHash('sha256').update(value).digest('hex');
}

function posix(value) {
	return value.split(sep).join('/');
}

function listSourceFiles(root, extensions) {
	return readdirSync(root, { recursive: true, withFileTypes: true })
		.filter(function keepSource(entry) {
			if (!entry.isFile()) return false;
			const relativePath = posix(
				relative(root, resolve(entry.parentPath ?? entry.path, entry.name)),
			);
			if (relativePath.endsWith('.d.ts')) return false;
			return extensions.some(function matches(extension) {
				return relativePath.endsWith(extension);
			});
		})
		.map(function toRelative(entry) {
			return posix(relative(root, resolve(entry.parentPath ?? entry.path, entry.name)));
		})
		.sort();
}

function assertionGroups(source) {
	const groups = [];
	for (const match of source.matchAll(/\/\/\s*@ts-expect-error([^\n]*)\n\s*([^\n]+)/g)) {
		groups.push(`expect-error:${match[1].trim()}:${match[2].replace(/\s+/g, ' ').trim()}`);
	}
	for (const match of source.matchAll(
		/\/\/\s*OCTANE DIVERGENCE\[[^\]]+\]\[[^\]]+\][^\n]*\n(?:\/\/[^\n]*\n)*/g,
	)) {
		groups.push(`divergence:${match[0].replace(/\s+/g, ' ').trim()}`);
	}
	return groups;
}

function inventoryEntry(path, source) {
	return {
		path,
		sha256: sha256(source),
		assertionGroups: assertionGroups(source).map(sha256),
	};
}

export function readTypeParityConfig(root, configPath = TYPE_PARITY_CONFIG) {
	const absoluteConfig = resolve(root, configPath);
	if (!existsSync(absoluteConfig)) throw new Error(`missing type parity config: ${configPath}`);
	const config = JSON.parse(readFileSync(absoluteConfig, 'utf8'));
	if (!config.upstreamRoot || !config.adaptedRoot || !config.adaptedProbesRoot) {
		throw new Error(
			'type-parity.json must declare upstreamRoot, adaptedRoot, and adaptedProbesRoot',
		);
	}
	if (!Array.isArray(config.pathMaps) || config.pathMaps.length === 0) {
		throw new Error('type-parity.json must declare pathMaps for every upstream source file');
	}
	if (!Array.isArray(config.adaptedOnly)) {
		throw new Error('type-parity.json must declare adaptedOnly for Octane-only modules');
	}
	if (!Array.isArray(config.adaptedProbes) || config.adaptedProbes.length === 0) {
		throw new Error('type-parity.json must declare adaptedProbes for authored type probes');
	}
	return config;
}

export function buildTypeInventory(root, config) {
	const upstreamRoot = resolve(root, config.upstreamRoot);
	const adaptedRoot = resolve(root, config.adaptedRoot);
	const adaptedProbesRoot = resolve(root, config.adaptedProbesRoot);
	const upstreamFiles = listSourceFiles(upstreamRoot, ['.ts', '.tsx']);
	const adaptedFiles = listSourceFiles(adaptedRoot, ['.ts', '.tsx', '.tsrx']);
	const mappedUpstream = config.pathMaps.map(function path(entry) {
		return entry.upstream;
	});
	if (JSON.stringify(mappedUpstream.slice().sort()) !== JSON.stringify(upstreamFiles)) {
		throw new Error('type-parity pathMaps must cover every upstream source file exactly once');
	}
	const expectedAdapted = new Set(
		config.pathMaps
			.map(function adapted(entry) {
				return entry.adapted;
			})
			.concat(
				config.adaptedOnly.map(function path(entry) {
					return entry.path;
				}),
			),
	);
	for (const file of expectedAdapted) {
		if (!adaptedFiles.includes(file)) {
			throw new Error(`missing: adapted type suite file ${file}`);
		}
	}
	for (const file of adaptedFiles) {
		if (!expectedAdapted.has(file)) {
			throw new Error(`unexpected adapted source file outside type-parity maps: ${file}`);
		}
	}

	const upstream = [];
	const adapted = [];
	for (const entry of config.pathMaps) {
		const upstreamSource = readFileSync(resolve(upstreamRoot, entry.upstream), 'utf8');
		const adaptedSource = readFileSync(resolve(adaptedRoot, entry.adapted), 'utf8');
		upstream.push(inventoryEntry(entry.upstream, upstreamSource));
		adapted.push(inventoryEntry(entry.adapted, adaptedSource));
	}
	for (const entry of config.adaptedOnly) {
		const source = readFileSync(resolve(adaptedRoot, entry.path), 'utf8');
		adapted.push(inventoryEntry(entry.path, source));
	}
	for (const entry of config.adaptedProbes) {
		const source = readFileSync(resolve(adaptedProbesRoot, entry.path), 'utf8');
		const groups = assertionGroups(source);
		if (groups.length === 0) {
			throw new Error(`${entry.path}: adapted probe must retain assertion groups`);
		}
		adapted.push(inventoryEntry(entry.path, source));
	}
	upstream.sort(function byPath(a, b) {
		return a.path.localeCompare(b.path);
	});
	adapted.sort(function byPath(a, b) {
		return a.path.localeCompare(b.path);
	});
	return { upstream, adapted };
}

export function verifyTanstackPacerTypes(root, { configPath = TYPE_PARITY_CONFIG } = {}) {
	const config = readTypeParityConfig(root, configPath);
	const inventory = buildTypeInventory(root, config);
	for (const [inventoryKey, configKey] of [
		['upstream', 'pristine'],
		['adapted', 'adapted'],
	]) {
		const inventoryPath = resolve(root, config.inventories[configKey]);
		const recorded = existsSync(inventoryPath)
			? JSON.parse(readFileSync(inventoryPath, 'utf8'))
			: undefined;
		if (JSON.stringify(recorded) !== JSON.stringify(inventory[inventoryKey])) {
			throw new Error(
				`${inventoryKey} type inventory drifted; review the change and regenerate its inventory`,
			);
		}
	}
	return {
		files: inventory.upstream.length,
		adaptedFiles: inventory.adapted.length,
		assertions: inventory.adapted.reduce(function sumAssertions(sum, file) {
			return sum + file.assertionGroups.length;
		}, 0),
	};
}

export function renderTypeInventories(root, configPath = TYPE_PARITY_CONFIG) {
	const config = readTypeParityConfig(root, configPath);
	const inventory = buildTypeInventory(root, config);
	return { config, inventory };
}
