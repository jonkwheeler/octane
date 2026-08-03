import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const hash = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');
const load = (root, path) => JSON.parse(readFileSync(resolve(root, path), 'utf8'));

export function verifyReactDropzoneEvidence(root) {
	const prefix = 'packages/react-dropzone';
	const pristine = load(root, `${prefix}/audit/runtime-inventories/pristine-runtime.json`);
	const classifications = load(root, `${prefix}/audit/test-classifications.json`);
	if (pristine.collected !== 218 || pristine.executed !== 218 || pristine.skipped !== 0)
		throw new Error('pristine runtime must record 218 passed identities without skips');
	if (classifications.upstreamCases.length !== pristine.cases.length)
		throw new Error('every upstream runtime identity must be classified exactly once');
	const upstreamKeys = classifications.upstreamCases.map(
		({ file, fullName, occurrence }) => `${file}\0${fullName}\0${occurrence}`,
	);
	if (new Set(upstreamKeys).size !== upstreamKeys.length)
		throw new Error('upstream runtime classifications contain duplicate identities');
	const counts = new Map();
	const expectedKeys = new Set(
		pristine.cases.map(({ file, fullName }) => {
			const identity = `${file}\0${fullName}`;
			const occurrence = (counts.get(identity) ?? 0) + 1;
			counts.set(identity, occurrence);
			return `${identity}\0${occurrence}`;
		}),
	);
	if (upstreamKeys.some((key) => !expectedKeys.has(key)))
		throw new Error('upstream runtime classifications contain a stale or fake identity');
	if (
		classifications.upstreamCases.some(
			(entry) => entry.disposition === 'pristine-oracle-plus-contract' && !entry.rationale,
		)
	)
		throw new Error('non-title-matched upstream cases require a rationale');

	const inventories = ['adapted-dom.json', 'adapted-server.json'].map((name) =>
		load(root, `${prefix}/audit/runtime-inventories/${name}`),
	);
	const authored = inventories.flatMap(({ files }) => files).sort();
	const classifiedAuthored = classifications.portAuthored.map(({ path }) => path).sort();
	if (JSON.stringify(authored) !== JSON.stringify(classifiedAuthored))
		throw new Error('every port-authored runtime test file must be classified exactly once');

	const types = load(root, `${prefix}/audit/type-inventories/parity.json`);
	if (types.pristine.length !== 9 || types.adapted.length !== 9)
		throw new Error('type inventory must contain all nine pristine/adapted programs');
	for (const entry of [...types.pristine, ...types.adapted]) {
		const path = resolve(root, entry.path);
		if (!existsSync(path) || hash(path) !== entry.sha256)
			throw new Error(`type evidence drifted: ${entry.path}`);
	}

	const ledger = load(root, `${prefix}/audit/transformation-ledger.json`);
	if (ledger.pairs.length !== 2 || ledger.permitted.length === 0)
		throw new Error('transformation ledger must cover both upstream source modules');
	for (const pair of ledger.pairs) {
		if (
			hash(resolve(root, pair.upstream)) !== pair.upstreamSha256 ||
			hash(resolve(root, pair.adapted)) !== pair.adaptedSha256
		)
			throw new Error(`source transformation evidence drifted: ${pair.adapted}`);
	}
	return true;
}
