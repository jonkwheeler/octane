import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const CONFIG = 'packages/zag/audit/test-classifications.json';

const ALLOWED = new Set([
	'adapted-upstream-suite',
	'octane-only-framework-contract',
	'unmodified-upstream-suite-wrapper',
	'react-octane-differential',
	'not-applicable',
]);

/**
 * Verifies every package-authored Zag test file has exactly one classification
 * and that adapted/pristine ownership matches the React parity roots.
 */
export function verifyZagTestClassifications(root) {
	const path = resolve(root, CONFIG);
	const config = JSON.parse(readFileSync(path, 'utf8'));
	if (config.schemaVersion !== 1) throw new Error(`${CONFIG}: schemaVersion must be 1`);
	if (!Array.isArray(config.tests) || config.tests.length === 0)
		throw new Error(`${CONFIG}: tests must be a non-empty array`);

	const seen = new Set();
	for (const entry of config.tests) {
		if (typeof entry.path !== 'string' || !entry.path.startsWith('packages/zag/'))
			throw new Error(`${CONFIG}: path must be under packages/zag/`);
		if (seen.has(entry.path)) throw new Error(`${CONFIG}: duplicate path ${entry.path}`);
		seen.add(entry.path);
		if (!ALLOWED.has(entry.disposition))
			throw new Error(`${CONFIG}: unsupported disposition ${entry.disposition}`);
		if (
			entry.disposition === 'adapted-upstream-suite' ||
			entry.disposition === 'unmodified-upstream-suite-wrapper'
		) {
			if (typeof entry.oracle !== 'string' || entry.oracle.length === 0)
				throw new Error(`${CONFIG}: ${entry.path} requires oracle`);
		} else if (typeof entry.reason !== 'string' || entry.reason.length === 0) {
			throw new Error(`${CONFIG}: ${entry.path} requires reason`);
		}
	}

	const required = [
		'packages/zag/tests/upstream/machine.test.ts',
		'packages/zag/tests/upstream/nested-states.test.ts',
		'packages/zag/tests/upstream-original.test.ts',
		'packages/zag/tests/differential/machine.test.ts',
		'packages/zag/tests/conformance/machine.test.ts',
		'packages/zag/tests/conformance/upstream-surface.test.ts',
		'packages/zag/tests/ssr/server.test.ts',
	];
	for (const path of required) {
		if (!seen.has(path)) throw new Error(`${CONFIG}: missing classification for ${path}`);
	}

	return { files: seen.size };
}
