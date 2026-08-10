import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export const PRISTINE_RUNTIME = 'packages/tiptap/audit/pristine-runtime.json';
export const ADAPTED_RUNTIME = 'packages/tiptap/audit/adapted-runtime.json';
export const MANIFEST = 'packages/tiptap/audit/react-parity.json';
export const UPSTREAM_MD = 'packages/tiptap/UPSTREAM.md';

function readJson(root, relativePath) {
	const absolute = resolve(root, relativePath);
	if (!existsSync(absolute)) throw new Error(`missing ${relativePath}`);
	return JSON.parse(readFileSync(absolute, 'utf8'));
}

function listedAdaptedEvidence(markdown) {
	const start = markdown.indexOf('## Upstream runtime suite');
	if (start === -1) throw new Error(`${UPSTREAM_MD}: missing Upstream runtime suite section`);
	const rest = markdown.slice(start);
	const end = rest.indexOf('\n## ');
	const body = end === -1 ? rest : rest.slice(0, end);
	return [...body.matchAll(/`tests\/upstream\/[^`]+`/g)].map(function path(match) {
		return match[0].slice(1, -1);
	});
}

function listedUpstreamSpecs(markdown) {
	const start = markdown.indexOf('## Upstream runtime suite');
	if (start === -1) throw new Error(`${UPSTREAM_MD}: missing Upstream runtime suite section`);
	const rest = markdown.slice(start);
	const end = rest.indexOf('\n## ');
	const body = end === -1 ? rest : rest.slice(0, end);
	return [...body.matchAll(/`src\/[^`]+`/g)].map(function path(match) {
		return match[0].slice(1, -1);
	});
}

/**
 * Executable pristine/adapted runtime crosswalk: case identities must match
 * one-for-one by fullName, UPSTREAM citations must cover every pristine file,
 * divergence runtime citations must resolve, and adapted inventory files must
 * exist on disk (fixture/provenance drift).
 */
export function verifyTiptapRuntimeCrosswalk(root) {
	const pristine = readJson(root, PRISTINE_RUNTIME);
	const adapted = readJson(root, ADAPTED_RUNTIME);
	const manifest = readJson(root, MANIFEST);
	const upstreamMd = readFileSync(resolve(root, UPSTREAM_MD), 'utf8');

	if (!Array.isArray(pristine.tests) || !Array.isArray(adapted.tests)) {
		throw new Error('tiptap runtime inventories must list tests arrays');
	}
	if (pristine.tests.length === 0) {
		throw new Error('tiptap pristine runtime inventory is empty');
	}
	if (pristine.tests.length !== adapted.tests.length) {
		throw new Error(
			`tiptap pristine/adapted runtime inventories differ in length (${pristine.tests.length} vs ${adapted.tests.length})`,
		);
	}

	const pristineNames = pristine.tests.map(function name(testCase) {
		return testCase.fullName;
	});
	const adaptedNames = adapted.tests.map(function name(testCase) {
		return testCase.fullName;
	});
	const pristineSet = new Set(pristineNames);
	const adaptedSet = new Set(adaptedNames);
	if (pristineSet.size !== pristineNames.length) {
		throw new Error('tiptap pristine runtime inventory has duplicate fullName identities');
	}
	if (adaptedSet.size !== adaptedNames.length) {
		throw new Error('tiptap adapted runtime inventory has duplicate fullName identities');
	}

	const missingFromAdapted = pristineNames.filter(function absent(fullName) {
		return !adaptedSet.has(fullName);
	});
	if (missingFromAdapted.length > 0) {
		throw new Error(
			`adapted runtime inventory omitted pristine identities:\n${missingFromAdapted.join('\n')}`,
		);
	}
	const extraInAdapted = adaptedNames.filter(function absent(fullName) {
		return !pristineSet.has(fullName);
	});
	if (extraInAdapted.length > 0) {
		throw new Error(
			`adapted runtime inventory has identities absent from pristine:\n${extraInAdapted.join('\n')}`,
		);
	}

	const adaptedIds = new Set(
		adapted.tests.map(function idOf(testCase) {
			return testCase.id;
		}),
	);
	for (const divergence of manifest.divergences ?? []) {
		for (const caseId of divergence.caseIds ?? []) {
			if (!caseId.startsWith('runtime:')) continue;
			if (!adaptedIds.has(caseId)) {
				throw new Error(
					`divergence ${divergence.id} cites unknown adapted runtime case ${caseId}`,
				);
			}
		}
	}

	for (const relativePath of adapted.files ?? []) {
		if (!existsSync(resolve(root, relativePath))) {
			throw new Error(`adapted runtime inventory cites missing fixture ${relativePath}`);
		}
	}
	for (const relativePath of pristine.files ?? []) {
		if (!existsSync(resolve(root, relativePath))) {
			throw new Error(`pristine runtime inventory cites missing fixture ${relativePath}`);
		}
	}

	const citedAdapted = new Set(listedAdaptedEvidence(upstreamMd));
	const citedUpstream = new Set(listedUpstreamSpecs(upstreamMd));
	const pristineSpecs = [
		...new Set(
			pristine.tests.map(function toSrc(testCase) {
				return testCase.file.replace(/^packages\/tiptap\/upstream\//, '');
			}),
		),
	].sort();
	for (const spec of pristineSpecs) {
		if (!citedUpstream.has(spec)) {
			throw new Error(`${UPSTREAM_MD}: missing runtime disposition citation for ${spec}`);
		}
	}
	const adaptedFiles = [...new Set(adapted.files ?? [])]
		.map(function toTestsPath(path) {
			return path.replace(/^packages\/tiptap\//, '');
		})
		.sort();
	for (const file of adaptedFiles) {
		if (!citedAdapted.has(file)) {
			throw new Error(`${UPSTREAM_MD}: missing adapted evidence citation for ${file}`);
		}
	}
	for (const cited of [...citedAdapted].sort()) {
		if (!adaptedFiles.includes(cited)) {
			throw new Error(
				`adapted runtime inventory drifted from UPSTREAM adapted evidence citation ${cited}`,
			);
		}
	}

	return {
		identities: pristine.tests.length,
		pristineFiles: pristineSpecs.length,
		adaptedFiles: adaptedFiles.length,
	};
}

/** Mutators used by negative-control tests. */
export function omitAdaptedIdentity(adapted, index = 0) {
	return {
		...adapted,
		tests: adapted.tests.filter(function keep(_testCase, current) {
			return current !== index;
		}),
	};
}

export function renameAdaptedIdentity(adapted, index = 0) {
	return {
		...adapted,
		tests: adapted.tests.map(function rename(testCase, current) {
			if (current !== index) return testCase;
			return { ...testCase, fullName: `${testCase.fullName} (renamed)` };
		}),
	};
}

export function dropAdaptedFixture(adapted, index = 0) {
	const files = [...(adapted.files ?? [])];
	files.splice(index, 1);
	return { ...adapted, files };
}
