import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

export const TYPE_PARITY_CONFIG = 'packages/tanstack-devtools/audit/type-parity.json';

const PAIRS = [
	{
		upstream: 'index.ts',
		adapted: 'index.ts',
	},
	{
		upstream: 'devtools.tsx',
		adapted: 'devtools.tsrx',
	},
];

function sha256(value) {
	return createHash('sha256').update(value).digest('hex');
}

function readText(root, relative) {
	return readFileSync(resolve(root, relative), 'utf8');
}

export function loadTypeParityConfig(root = process.cwd()) {
	return JSON.parse(readFileSync(resolve(root, TYPE_PARITY_CONFIG), 'utf8'));
}

export function buildTypeInventories(root = process.cwd()) {
	const config = loadTypeParityConfig(root);
	const upstreamRoot = resolve(root, config.upstreamRoot);
	const adaptedRoot = resolve(root, config.adaptedRoot);
	const upstream = [];
	const adapted = [];
	for (const pair of PAIRS) {
		upstream.push({
			path: pair.upstream,
			sha256: sha256(readText(upstreamRoot, pair.upstream)),
			assertionGroups: [],
		});
		adapted.push({
			path: pair.adapted,
			sha256: sha256(readText(adaptedRoot, pair.adapted)),
			assertionGroups: [],
		});
	}
	return { upstream, adapted, config };
}

export function writeTypeInventories(root = process.cwd()) {
	const { upstream, adapted, config } = buildTypeInventories(root);
	writeFileSync(
		resolve(root, config.inventories.upstream),
		`${JSON.stringify(upstream, null, '\t')}\n`,
	);
	writeFileSync(
		resolve(root, config.inventories.adapted),
		`${JSON.stringify(adapted, null, '\t')}\n`,
	);
	return { upstream, adapted, config };
}

export function verifyTypeInventories(root = process.cwd()) {
	const absoluteConfig = resolve(root, TYPE_PARITY_CONFIG);
	if (!existsSync(absoluteConfig))
		throw new Error(`missing type parity config: ${TYPE_PARITY_CONFIG}`);
	const { upstream, adapted, config } = buildTypeInventories(root);
	for (const side of ['upstream', 'adapted']) {
		const inventoryPath = resolve(root, config.inventories[side]);
		const recorded = existsSync(inventoryPath)
			? JSON.parse(readFileSync(inventoryPath, 'utf8'))
			: undefined;
		const expected = side === 'upstream' ? upstream : adapted;
		if (JSON.stringify(recorded) !== JSON.stringify(expected)) {
			throw new Error(
				`${side} type inventory drifted; review the change and regenerate its inventory`,
			);
		}
	}
	return {
		pairs: PAIRS.length,
		files: upstream.length,
	};
}
