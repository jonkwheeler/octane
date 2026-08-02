#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('../../..', import.meta.url)));
const override = process.env.OCTANE_DREI_PARITY_AUDIT;
const audit = override ? resolve(override) : resolve(root, 'packages/drei/audit');
const read = (name) => JSON.parse(readFileSync(resolve(audit, name), 'utf8'));
const digest = (value) => createHash('sha256').update(value).digest('hex');
const portable = (value) => value.replaceAll('\\', '/');
const fail = (message) => {
	throw new Error(`Drei React-parity audit: ${message}`);
};

const inventory = read('adapted-runtime.json');
const evidence = read('runtime-evidence.json');
const classifications = read('test-classifications.json');
const upstream = read('upstream-test-artifacts.json');

const discovered = readdirSync(resolve(root, 'packages/drei/tests'), {
	recursive: true,
	withFileTypes: true,
})
	.filter((entry) => entry.isFile() && /\.test\.(?:ts|tsx|tsrx)$/.test(entry.name))
	.map((entry) => portable(relative(root, resolve(entry.parentPath, entry.name))))
	.sort();
const inventoried = [...inventory.files].sort();
if (JSON.stringify(discovered) !== JSON.stringify(inventoried))
	fail('a runtime test file was skipped or added');
const classified = classifications.tests.map((entry) => entry.path).sort();
if (JSON.stringify(discovered) !== JSON.stringify(classified))
	fail('every port-authored test must have exactly one classification');
if (new Set(classified).size !== classified.length)
	fail('a port-authored test has multiple classifications');

for (const entry of classifications.tests) {
	if (entry.disposition === 'react-octane-differential') {
		if (!entry.oracle) fail(`${entry.path} lacks a pinned React oracle`);
		const source = readFileSync(resolve(root, entry.path), 'utf8');
		if (!source.includes('@react-three/drei'))
			fail(`${entry.path} no longer imports its React oracle`);
	} else if (!entry.disposition.startsWith('octane-only-') || !entry.reason || entry.oracle) {
		fail(`${entry.path} has an invalid unpaired classification`);
	}
}

if (JSON.stringify(evidence.files.map((entry) => entry.path).sort()) !== JSON.stringify(discovered))
	fail('runtime file evidence does not cover the complete suite');
for (const file of evidence.files) {
	const contents = readFileSync(resolve(root, file.path));
	if (digest(contents) !== file.sha256) fail(`${file.path} file hash drifted`);
	const assertions = inventory.tests.filter((test) => test.file === file.path);
	if (assertions.length !== file.assertionCount) fail(`${file.path} lost or gained an assertion`);
	if (digest(assertions.map((test) => test.fullName).join('\n')) !== file.assertionInventorySha256)
		fail(`${file.path} assertion inventory drifted`);
}

const discoveredUpstream = readdirSync(resolve(root, 'packages/drei/upstream/test'), {
	recursive: true,
	withFileTypes: true,
})
	.filter((entry) => entry.isFile())
	.map((entry) => portable(relative(root, resolve(entry.parentPath, entry.name))))
	.sort();
if (
	JSON.stringify(upstream.artifacts.map((entry) => entry.path).sort()) !==
	JSON.stringify(discoveredUpstream)
)
	fail('every vendored upstream test artifact must have exactly one disposition');
for (const artifact of upstream.artifacts) {
	if (!artifact.disposition || !artifact.reason)
		fail(`${artifact.path} lacks a disposition or reason`);
	if (!existsSync(resolve(root, artifact.path))) fail(`${artifact.path} is missing`);
	if (digest(readFileSync(resolve(root, artifact.path))) !== artifact.sha256)
		fail(`${artifact.path} hash drifted`);
}
if (upstream.upstreamTypeSuite !== 'absent')
	fail('pinned Drei must not claim an upstream type suite');
const upstreamFiles = readdirSync(resolve(root, 'packages/drei/upstream'), {
	recursive: true,
	withFileTypes: true,
})
	.filter((entry) => entry.isFile())
	.map((entry) => resolve(entry.parentPath, entry.name));
if (upstreamFiles.some((path) => /(?:type.?tests?|__typetest__)/i.test(path)))
	fail('upstream type-test absence claim is stale');
const actualExpectErrors = upstreamFiles.flatMap((path) =>
	/\.[cm]?[jt]sx?$/.test(path)
		? readFileSync(path, 'utf8')
				.split('\n')
				.flatMap((line, index) =>
					line.includes('@ts-expect-error')
						? [
								{
									path: portable(relative(root, path)),
									line: index + 1,
									sha256: digest(line.trim()),
								},
							]
						: [],
				)
		: [],
);
if (JSON.stringify(actualExpectErrors) !== JSON.stringify(upstream.upstreamSourceExpectErrors))
	fail('an upstream source @ts-expect-error directive was removed, added, or changed');
if (upstream.allowedTransformations.length !== 0)
	fail('Drei has no adapted upstream suite, so its transformation ledger must be empty');

console.log(
	`Drei parity evidence is current (${inventory.tests.length} assertions in ${inventory.files.length} files).`,
);
