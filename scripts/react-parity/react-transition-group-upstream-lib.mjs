import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';

import { extractTestCases } from './inventory-lib.mjs';

const PACKAGE_ROOT = 'packages/react-transition-group';
const UPSTREAM_ROOT = `${PACKAGE_ROOT}/upstream`;
const UPSTREAM_TEST_ROOT = `${UPSTREAM_ROOT}/test`;
const INVENTORY_PATH = `${PACKAGE_ROOT}/audit/SHA256SUMS`;
const ADAPTED_EVIDENCE_INVENTORY_PATH = `${PACKAGE_ROOT}/audit/adapted-evidence.SHA256SUMS`;
const DISPOSITION_PATH = `${PACKAGE_ROOT}/audit/upstream-test-dispositions.json`;
const CROSSWALK_PATH = `${PACKAGE_ROOT}/audit/case-crosswalk.json`;
const ADAPTED_INVENTORIES = [
	`${PACKAGE_ROOT}/audit/adapted-runtime.json`,
	`${PACKAGE_ROOT}/audit/adapted-runtime-server.json`,
];
const ADAPTED_EVIDENCE_ROOTS = [
	`${PACKAGE_ROOT}/tests/upstream`,
	`${PACKAGE_ROOT}/tests/ssr/upstream-import.test.ts`,
	`${PACKAGE_ROOT}/tests/_fixtures/upstream-probes.tsrx`,
];

const SUPPORT_ARTIFACTS = new Set(['.eslintrc.yml', 'setup.js', 'setupAfterEnv.js', 'utils.js']);
const CITATION_RE = /\/\/\s*Per path:\s*(.+)$/;
const CITATION_PATH_RE = /^(.*?):(\d+)(?:-(\d+))?$/;

function filesBelow(root) {
	return readdirSync(root, { recursive: true, withFileTypes: true })
		.filter(function keepFiles(entry) {
			return entry.isFile();
		})
		.map(function absolutePath(entry) {
			return resolve(entry.parentPath ?? entry.path, entry.name);
		})
		.sort();
}

function portableRelative(root, file) {
	return relative(root, file).split(sep).join('/');
}

function parseCitation(citation) {
	const match = citation.match(CITATION_PATH_RE);
	if (!match) return null;
	return {
		path: match[1],
		start: Number(match[2]),
		end: Number(match[3] ?? match[2]),
	};
}

function citationForCase(source, caseLine) {
	const lines = source.split('\n');
	const start = Math.max(0, (caseLine ?? 1) - 1);
	for (let index = start; index >= Math.max(0, start - 8); index--) {
		const match = lines[index].match(CITATION_RE);
		if (match) return match[1].trim();
	}
	return null;
}

export function renderReactTransitionGroupUpstreamInventory(repoRoot) {
	const upstreamRoot = resolve(repoRoot, UPSTREAM_ROOT);
	return `${filesBelow(upstreamRoot)
		.map(function lineFor(file) {
			const digest = createHash('sha256').update(readFileSync(file)).digest('hex');
			return `${digest}  upstream/${portableRelative(upstreamRoot, file)}`;
		})
		.join('\n')}\n`;
}

function listAdaptedEvidenceFiles(repoRoot) {
	const files = [];
	for (const root of ADAPTED_EVIDENCE_ROOTS) {
		const absolute = resolve(repoRoot, root);
		if (!existsSync(absolute)) {
			throw new Error(`missing adapted evidence root: ${root}`);
		}
		if (statSync(absolute).isFile()) {
			files.push(absolute);
			continue;
		}
		for (const file of filesBelow(absolute)) {
			if (file.endsWith('.test.ts') || file.endsWith('.tsrx')) {
				files.push(file);
			}
		}
	}
	return files.sort();
}

export function renderReactTransitionGroupAdaptedEvidenceInventory(repoRoot) {
	return `${listAdaptedEvidenceFiles(repoRoot)
		.map(function lineFor(file) {
			const digest = createHash('sha256').update(readFileSync(file)).digest('hex');
			return `${digest}  ${portableRelative(repoRoot, file)}`;
		})
		.join('\n')}\n`;
}

export function listUpstreamTestArtifacts(repoRoot) {
	const testRoot = resolve(repoRoot, UPSTREAM_TEST_ROOT);
	return filesBelow(testRoot).map(function relativePath(file) {
		return portableRelative(testRoot, file);
	});
}

export function listUpstreamTestFiles(repoRoot) {
	return listUpstreamTestArtifacts(repoRoot).filter(function isSuite(file) {
		return file.endsWith('-test.js');
	});
}

export function collectUpstreamCaseInventory(repoRoot) {
	const testRoot = resolve(repoRoot, UPSTREAM_TEST_ROOT);
	const cases = [];
	for (const file of listUpstreamTestFiles(repoRoot)) {
		const source = readFileSync(resolve(testRoot, file), 'utf8');
		for (const entry of extractTestCases(source, { file })) {
			cases.push({
				file: `test/${file}`,
				title: entry.title,
				line: entry.line,
			});
		}
	}
	return cases.sort(function compareCases(left, right) {
		return (
			left.file.localeCompare(right.file) ||
			left.line - right.line ||
			left.title.localeCompare(right.title)
		);
	});
}

function collectAdaptedCases(repoRoot) {
	const cases = [];
	const roots = [
		`${PACKAGE_ROOT}/tests/upstream`,
		`${PACKAGE_ROOT}/tests/ssr/upstream-import.test.ts`,
	];
	for (const root of roots) {
		const absolute = resolve(repoRoot, root);
		if (!existsSync(absolute)) {
			throw new Error(`missing adapted evidence root: ${root}`);
		}
		const files = statSync(absolute).isFile()
			? [absolute]
			: filesBelow(absolute).filter(function keepTests(file) {
					return file.endsWith('.test.ts');
				});
		for (const file of files) {
			const relativeFile = portableRelative(repoRoot, file);
			const source = readFileSync(file, 'utf8');
			for (const entry of extractTestCases(source, { file: relativeFile })) {
				cases.push({
					file: relativeFile,
					title: entry.title,
					line: entry.line,
					citation: citationForCase(source, entry.line),
				});
			}
		}
	}
	return cases;
}

function loadAdaptedInventoryFullNames(repoRoot) {
	const fullNamesByFile = new Map();
	for (const inventoryPath of ADAPTED_INVENTORIES) {
		const inventory = JSON.parse(readFileSync(resolve(repoRoot, inventoryPath), 'utf8'));
		for (const test of inventory.tests ?? []) {
			const list = fullNamesByFile.get(test.file) ?? [];
			list.push(test.fullName);
			fullNamesByFile.set(test.file, list);
		}
	}
	return fullNamesByFile;
}

function consumeInventoryTitle(fullNamesByFile, file, title) {
	const fullNames = fullNamesByFile.get(file) ?? [];
	const index = fullNames.findIndex(function matchesTitle(fullName) {
		return fullName === title || fullName.endsWith(` ${title}`);
	});
	if (index === -1) return false;
	fullNames.splice(index, 1);
	return true;
}

function verifyCaseCrosswalk(repoRoot, upstreamCases) {
	const crosswalkPath = resolve(repoRoot, CROSSWALK_PATH);
	if (!existsSync(crosswalkPath)) {
		throw new Error(`missing case crosswalk: ${CROSSWALK_PATH}`);
	}
	const crosswalk = JSON.parse(readFileSync(crosswalkPath, 'utf8'));
	if (crosswalk.schemaVersion !== 1 || !Array.isArray(crosswalk.cases)) {
		throw new Error('case-crosswalk.json must declare schemaVersion 1 cases');
	}
	if (crosswalk.cases.length !== upstreamCases.length) {
		throw new Error(
			`case crosswalk must cover every upstream case: found ${crosswalk.cases.length}, expected ${upstreamCases.length}`,
		);
	}

	const adaptedCases = collectAdaptedCases(repoRoot);
	const adaptedKeys = new Set(
		adaptedCases.map(function keyOf(entry) {
			return `${entry.file}\0${entry.title}\0${entry.line}`;
		}),
	);
	const usedAdapted = new Set();
	const fullNamesByFile = loadAdaptedInventoryFullNames(repoRoot);
	const upstreamKeys = upstreamCases.map(function keyOf(entry) {
		return `${entry.file}\0${entry.title}\0${entry.line}`;
	});
	const crosswalkKeys = [];

	for (const entry of crosswalk.cases) {
		if (typeof entry.upstreamFile !== 'string' || typeof entry.upstreamTitle !== 'string') {
			throw new Error('case crosswalk entries require upstreamFile and upstreamTitle');
		}
		if (!Number.isInteger(entry.upstreamLine) || entry.upstreamLine < 1) {
			throw new Error(
				`${entry.upstreamFile}::${entry.upstreamTitle}: crosswalk requires upstreamLine`,
			);
		}
		const upstreamKey = `${entry.upstreamFile}\0${entry.upstreamTitle}\0${entry.upstreamLine}`;
		crosswalkKeys.push(upstreamKey);
		if (!upstreamKeys.includes(upstreamKey)) {
			throw new Error(
				`${entry.upstreamFile}:${entry.upstreamLine}: crosswalk case is not in the upstream inventory`,
			);
		}

		if (entry.disposition === 'not-applicable') {
			if (typeof entry.rationale !== 'string' || entry.rationale.length < 20) {
				throw new Error(
					`${entry.upstreamFile}::${entry.upstreamTitle}: not-applicable cases require a concrete rationale`,
				);
			}
			continue;
		}
		if (entry.disposition !== 'adapted') {
			throw new Error(
				`${entry.upstreamFile}::${entry.upstreamTitle}: disposition must be adapted or not-applicable`,
			);
		}
		if (
			typeof entry.adaptedFile !== 'string' ||
			typeof entry.adaptedTitle !== 'string' ||
			typeof entry.citation !== 'string'
		) {
			throw new Error(
				`${entry.upstreamFile}::${entry.upstreamTitle}: adapted cases require adaptedFile, adaptedTitle, and citation`,
			);
		}
		if (!existsSync(resolve(repoRoot, entry.adaptedFile))) {
			throw new Error(
				`${entry.upstreamFile}::${entry.upstreamTitle}: missing adaptedEvidence ${entry.adaptedFile}`,
			);
		}
		const parsed = parseCitation(entry.citation);
		if (!parsed) {
			throw new Error(
				`${entry.upstreamFile}::${entry.upstreamTitle}: citation must be path:start[-end]`,
			);
		}
		const upstreamLeaf = entry.upstreamFile.replace(/^test\//, '');
		if (!parsed.path.endsWith(upstreamLeaf) && !parsed.path.endsWith(entry.upstreamFile)) {
			throw new Error(
				`${entry.upstreamFile}::${entry.upstreamTitle}: citation path does not target the upstream suite`,
			);
		}
		if (entry.upstreamLine < parsed.start || entry.upstreamLine > parsed.end) {
			throw new Error(
				`${entry.upstreamFile}::${entry.upstreamTitle}: citation range ${parsed.start}-${parsed.end} does not cover upstreamLine ${entry.upstreamLine}`,
			);
		}

		const adaptedSource = readFileSync(resolve(repoRoot, entry.adaptedFile), 'utf8');
		const adaptedMatches = extractTestCases(adaptedSource, { file: entry.adaptedFile }).filter(
			function sameTitle(item) {
				return item.title === entry.adaptedTitle;
			},
		);
		if (adaptedMatches.length === 0) {
			throw new Error(
				`${entry.adaptedFile}: adapted case missing title ${JSON.stringify(entry.adaptedTitle)}`,
			);
		}
		const citedMatch = adaptedMatches.find(function hasCitation(item) {
			return citationForCase(adaptedSource, item.line) === entry.citation;
		});
		if (!citedMatch) {
			throw new Error(
				`${entry.adaptedFile}: missing // Per path: ${entry.citation} for ${entry.adaptedTitle}`,
			);
		}
		const adaptedKey = `${entry.adaptedFile}\0${entry.adaptedTitle}\0${citedMatch.line}`;
		if (!adaptedKeys.has(adaptedKey)) {
			throw new Error(
				`${entry.adaptedFile}: adapted case identity drifted for ${entry.adaptedTitle}`,
			);
		}
		if (usedAdapted.has(adaptedKey)) {
			throw new Error(`${entry.adaptedFile}: adapted case ${entry.adaptedTitle} mapped twice`);
		}
		usedAdapted.add(adaptedKey);

		if (!consumeInventoryTitle(fullNamesByFile, entry.adaptedFile, entry.adaptedTitle)) {
			throw new Error(
				`${entry.adaptedFile}: adapted inventory is missing identity for ${entry.adaptedTitle}`,
			);
		}
	}

	if (
		JSON.stringify(crosswalkKeys.slice().sort()) !== JSON.stringify(upstreamKeys.slice().sort())
	) {
		throw new Error('case crosswalk keys must match the upstream case inventory exactly once');
	}
	if (usedAdapted.size !== adaptedCases.length) {
		throw new Error(
			`adapted case/fixture drift: crosswalk maps ${usedAdapted.size} adapted cases, found ${adaptedCases.length}`,
		);
	}

	return {
		adapted: usedAdapted.size,
		notApplicable: crosswalk.cases.filter(function na(entry) {
			return entry.disposition === 'not-applicable';
		}).length,
	};
}

export function verifyReactTransitionGroupUpstream(repoRoot) {
	const expectedInventory = readFileSync(resolve(repoRoot, INVENTORY_PATH), 'utf8');
	const actualInventory = renderReactTransitionGroupUpstreamInventory(repoRoot);
	if (actualInventory !== expectedInventory) {
		throw new Error('react-transition-group upstream inventory drifted; re-vendor the pinned tag');
	}

	const dispositions = JSON.parse(readFileSync(resolve(repoRoot, DISPOSITION_PATH), 'utf8'));
	if (dispositions.schemaVersion !== 1 || !Array.isArray(dispositions.artifacts)) {
		throw new Error('upstream-test-dispositions.json must declare schemaVersion 1 artifacts');
	}

	const artifacts = listUpstreamTestArtifacts(repoRoot);
	const dispositionPaths = dispositions.artifacts.map(function pathOf(entry) {
		return entry.path;
	});
	if (
		JSON.stringify(dispositionPaths.slice().sort()) !== JSON.stringify(artifacts.slice().sort())
	) {
		throw new Error(
			'react-transition-group upstream test dispositions must account for every upstream/test artifact',
		);
	}

	const suiteFiles = listUpstreamTestFiles(repoRoot);
	for (const entry of dispositions.artifacts) {
		if (typeof entry.path !== 'string' || typeof entry.disposition !== 'string') {
			throw new Error(
				`${entry.path ?? '<missing>'}: disposition entries require path and disposition`,
			);
		}
		if (SUPPORT_ARTIFACTS.has(entry.path)) {
			if (entry.disposition !== 'support') {
				throw new Error(`${entry.path}: support artifacts must use disposition "support"`);
			}
			continue;
		}
		if (!suiteFiles.includes(entry.path)) {
			throw new Error(`${entry.path}: unknown upstream test artifact disposition`);
		}
		const allowed = new Set([
			'pristine-oracle',
			'pristine-oracle-partially-adapted',
			'pristine-oracle-adapted',
			'not-applicable',
		]);
		if (!allowed.has(entry.disposition)) {
			throw new Error(
				`${entry.path}: suite disposition must be a pristine oracle classification or not-applicable`,
			);
		}
		if (typeof entry.rationale !== 'string' || entry.rationale.length === 0) {
			throw new Error(`${entry.path}: disposition requires a rationale`);
		}
		if (!Number.isInteger(entry.caseCount) || entry.caseCount < 0) {
			throw new Error(`${entry.path}: disposition requires a non-negative caseCount`);
		}
		if (
			entry.disposition === 'pristine-oracle-adapted' ||
			entry.disposition === 'pristine-oracle-partially-adapted'
		) {
			if (!Array.isArray(entry.adaptedEvidence) || entry.adaptedEvidence.length === 0) {
				throw new Error(`${entry.path}: adapted dispositions require adaptedEvidence`);
			}
			for (const evidence of entry.adaptedEvidence) {
				if (!existsSync(resolve(repoRoot, evidence))) {
					throw new Error(`${entry.path}: missing adaptedEvidence ${evidence}`);
				}
			}
		}
	}

	const inventoriedCases = collectUpstreamCaseInventory(repoRoot);
	const expectedCaseCount = dispositions.artifacts
		.filter(function suitesOnly(entry) {
			return !SUPPORT_ARTIFACTS.has(entry.path);
		})
		.reduce(function sum(total, entry) {
			return total + entry.caseCount;
		}, 0);
	if (inventoriedCases.length !== expectedCaseCount) {
		throw new Error(
			`upstream case inventory drifted: found ${inventoriedCases.length} cases, dispositions declare ${expectedCaseCount}`,
		);
	}

	for (const entry of dispositions.artifacts.filter(function suitesOnly(item) {
		return !SUPPORT_ARTIFACTS.has(item.path);
	})) {
		const actual = inventoriedCases.filter(function forFile(item) {
			return item.file === `test/${entry.path}`;
		}).length;
		if (actual !== entry.caseCount) {
			throw new Error(
				`${entry.path}: disposition caseCount ${entry.caseCount} does not match ${actual} extracted cases`,
			);
		}
	}

	const crosswalk = verifyCaseCrosswalk(repoRoot, inventoriedCases);

	const expectedAdaptedEvidence = readFileSync(
		resolve(repoRoot, ADAPTED_EVIDENCE_INVENTORY_PATH),
		'utf8',
	);
	const actualAdaptedEvidence = renderReactTransitionGroupAdaptedEvidenceInventory(repoRoot);
	if (actualAdaptedEvidence !== expectedAdaptedEvidence) {
		throw new Error(
			'react-transition-group adapted assertion/fixture inventory drifted; review and record the change',
		);
	}

	return {
		artifacts: artifacts.length,
		cases: inventoriedCases.length,
		adaptedCases: crosswalk.adapted,
		notApplicableCases: crosswalk.notApplicable,
	};
}
