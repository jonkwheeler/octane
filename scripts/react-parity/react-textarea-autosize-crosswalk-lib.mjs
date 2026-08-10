import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const CROSSWALK = 'packages/react-textarea-autosize/audit/upstream-crosswalk.json';
const PRISTINE = 'packages/react-textarea-autosize/audit/pristine-runtime.json';
const ADAPTED = 'packages/react-textarea-autosize/audit/adapted-runtime.json';

function readJson(root, relativePath) {
	const absolute = resolve(root, relativePath);
	if (!existsSync(absolute)) throw new Error(`missing ${relativePath}`);
	return JSON.parse(readFileSync(absolute, 'utf8'));
}

export function verifyReactTextareaAutosizeCrosswalk(
	root,
	{
		crosswalkPath = CROSSWALK,
		pristinePath = PRISTINE,
		adaptedPath = ADAPTED,
		crosswalk: crosswalkOverride,
		pristine: pristineOverride,
		adapted: adaptedOverride,
	} = {},
) {
	const crosswalk = crosswalkOverride ?? readJson(root, crosswalkPath);
	const pristine = pristineOverride ?? readJson(root, pristinePath);
	const adapted = adaptedOverride ?? readJson(root, adaptedPath);
	if (!Array.isArray(crosswalk.cases) || crosswalk.cases.length === 0) {
		throw new Error('upstream crosswalk must declare at least one case mapping');
	}
	if (crosswalk.cases.length !== pristine.tests.length) {
		throw new Error('upstream crosswalk case count must match pristine inventory');
	}
	if (crosswalk.cases.length !== adapted.tests.length) {
		throw new Error('upstream crosswalk case count must match adapted inventory');
	}
	const pristineNames = new Set(
		pristine.tests.map(function name(entry) {
			return entry.fullName;
		}),
	);
	const adaptedNames = new Set(
		adapted.tests.map(function name(entry) {
			return entry.fullName;
		}),
	);
	const adaptedFiles = new Set(adapted.files ?? []);
	const seenUpstream = new Set();
	const seenAdapted = new Set();
	for (const entry of crosswalk.cases) {
		if (!entry.upstreamFullName || !entry.adaptedFullName || !entry.adaptedFile) {
			throw new Error(
				'each crosswalk case requires upstreamFullName, adaptedFullName, and adaptedFile',
			);
		}
		if (entry.upstreamFullName === entry.adaptedFullName) {
			throw new Error(`${entry.upstreamFullName}: adapted name must differ from pristine`);
		}
		if (!pristineNames.has(entry.upstreamFullName)) {
			throw new Error(
				`crosswalk upstream identity missing from pristine inventory: ${entry.upstreamFullName}`,
			);
		}
		if (!adaptedNames.has(entry.adaptedFullName)) {
			throw new Error(
				`crosswalk adapted identity missing from adapted inventory: ${entry.adaptedFullName}`,
			);
		}
		if (!adaptedFiles.has(entry.adaptedFile)) {
			throw new Error(
				`crosswalk adaptedFile missing from adapted inventory files: ${entry.adaptedFile}`,
			);
		}
		if (seenUpstream.has(entry.upstreamFullName)) {
			throw new Error(`duplicate crosswalk upstream identity: ${entry.upstreamFullName}`);
		}
		if (seenAdapted.has(entry.adaptedFullName)) {
			throw new Error(`duplicate crosswalk adapted identity: ${entry.adaptedFullName}`);
		}
		seenUpstream.add(entry.upstreamFullName);
		seenAdapted.add(entry.adaptedFullName);
	}
	for (const name of pristineNames) {
		if (!seenUpstream.has(name)) {
			throw new Error(`pristine identity has no crosswalk mapping: ${name}`);
		}
	}
	for (const name of adaptedNames) {
		if (!seenAdapted.has(name)) {
			throw new Error(`adapted identity has no crosswalk mapping: ${name}`);
		}
	}
	return { cases: crosswalk.cases.length };
}
