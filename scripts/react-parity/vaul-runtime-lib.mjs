import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { extractTestCases } from './inventory-lib.mjs';

export const CROSSWALK_PATH = 'packages/vaul/audit/adapted-runtime-crosswalk.json';
export const INVENTORIES = {
	vaul: 'packages/vaul/audit/adapted-runtime.json',
	'vaul-browser': 'packages/vaul/audit/adapted-runtime-browser.json',
};

function readJson(root, relativePath) {
	return JSON.parse(readFileSync(resolve(root, relativePath), 'utf8'));
}

function ensureFragments(label, source, fragments) {
	for (const fragment of fragments) {
		if (!source.includes(fragment)) {
			throw new Error(`${label}: missing required fragment ${JSON.stringify(fragment)}`);
		}
	}
}

function assertCaseExecutable(source, title, file) {
	const cases = extractTestCases(source, { file });
	const match = cases.find(function findTitle(entry) {
		return entry.title === title;
	});
	if (!match) {
		throw new Error(`adapted case title not registered: ${title}`);
	}
	const blocked = new Set(['skip', 'todo', 'only', 'failing']);
	const hit = (match.modifiers ?? []).find(function isBlocked(modifier) {
		return blocked.has(modifier);
	});
	if (hit) {
		throw new Error(`adapted case must execute without skip/todo/only/failing: ${title}`);
	}
}

export function loadVaulAdaptedCrosswalk(root) {
	return readJson(root, CROSSWALK_PATH);
}

export function verifyVaulAdaptedRuntimeStructure(
	root,
	{ crosswalk = loadVaulAdaptedCrosswalk(root) } = {},
) {
	if (
		!Array.isArray(crosswalk.permittedTransformations) ||
		crosswalk.permittedTransformations.length === 0
	) {
		throw new Error('adapted runtime crosswalk must declare permittedTransformations');
	}
	if (!Array.isArray(crosswalk.cases) || crosswalk.cases.length === 0) {
		throw new Error('adapted runtime crosswalk must declare cases');
	}

	const inventoriesByProject = new Map();
	for (const [project, path] of Object.entries(INVENTORIES)) {
		inventoriesByProject.set(project, readJson(root, path));
	}

	const casesById = new Map();
	for (const entry of crosswalk.cases) {
		if (casesById.has(entry.id)) throw new Error(`duplicate crosswalk case id ${entry.id}`);
		casesById.set(entry.id, entry);
		const inventory = inventoriesByProject.get(entry.project);
		if (!inventory) throw new Error(`${entry.id}: unknown project ${entry.project}`);
		const identity = inventory.tests.find(function findIdentity(test) {
			return test.id === entry.id;
		});
		if (!identity) {
			throw new Error(`${entry.id}: missing from ${INVENTORIES[entry.project]}`);
		}
		if (identity.file !== entry.adaptedFile) {
			throw new Error(`${entry.id}: inventory file drifted from crosswalk`);
		}
		if (!identity.fullName.endsWith(entry.adaptedTitle)) {
			throw new Error(`${entry.id}: inventory fullName drifted from crosswalk title`);
		}

		const adaptedSource = readFileSync(resolve(root, entry.adaptedFile), 'utf8');
		assertCaseExecutable(adaptedSource, entry.adaptedTitle, entry.adaptedFile);
		ensureFragments(
			`${entry.adaptedFile} :: ${entry.adaptedTitle}`,
			adaptedSource,
			entry.requiredFragments,
		);

		const upstreamSource = readFileSync(resolve(root, entry.upstream.file), 'utf8');
		for (const title of entry.upstream.titles) {
			if (!upstreamSource.includes(title)) {
				throw new Error(`${entry.id}: upstream citation missing title ${JSON.stringify(title)}`);
			}
		}

		for (const fixtureFile of entry.fixtureFiles) {
			const fixtureSource = readFileSync(resolve(root, fixtureFile), 'utf8');
			ensureFragments(fixtureFile, fixtureSource, entry.fixtureFragments);
		}
	}

	for (const [project, inventory] of inventoriesByProject) {
		const covered = new Set(
			crosswalk.cases
				.filter(function keepProject(entry) {
					return entry.project === project;
				})
				.map(function idOf(entry) {
					return entry.id;
				}),
		);
		for (const test of inventory.tests) {
			if (!covered.has(test.id)) {
				throw new Error(
					`${INVENTORIES[project]}: inventory identity ${test.id} lacks a structural crosswalk case`,
				);
			}
		}
	}

	return {
		cases: crosswalk.cases.length,
		projects: Object.keys(INVENTORIES),
		permittedTransformations: crosswalk.permittedTransformations.length,
	};
}
