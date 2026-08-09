import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = 'packages/react-spring/upstream';
const PER_COMMENT = /^\s*\/\/\s*Per\s+(\S+):(\d+)\s*$/;

function filesUnder(root) {
	return readdirSync(root, { recursive: true, withFileTypes: true })
		.filter(function keepFiles(entry) {
			return entry.isFile();
		})
		.map(function toPath(entry) {
			return join(entry.parentPath ?? entry.path, entry.name);
		});
}

function digest(path) {
	return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function collectPerComments(source) {
	const comments = [];
	for (const line of source.split('\n')) {
		const match = PER_COMMENT.exec(line);
		if (match !== null) {
			comments.push({ path: match[1], line: Number(match[2]) });
		}
	}
	return comments;
}

function loadInventory(repoRoot, inventoryPath) {
	const absolute = join(repoRoot, inventoryPath);
	if (!existsSync(absolute)) {
		throw new Error(`runtime inventory is missing: ${inventoryPath}`);
	}
	const inventory = JSON.parse(readFileSync(absolute, 'utf8'));
	if (!Array.isArray(inventory.tests) || inventory.tests.length === 0) {
		throw new Error(`runtime inventory has no case identities: ${inventoryPath}`);
	}
	return inventory;
}

export function verifyReactSpringUpstream(repoRoot) {
	const root = join(repoRoot, ROOT);
	const inventoryPath = join(root, 'SHA256SUMS');
	if (!existsSync(inventoryPath)) throw new Error('React Spring SHA256SUMS is missing');
	const expected = new Map(
		readFileSync(inventoryPath, 'utf8')
			.trim()
			.split('\n')
			.map(function parseLine(line) {
				const match = /^([a-f0-9]{64})  (\.\/.*)$/.exec(line);
				if (match === null) throw new Error(`invalid checksum line: ${line}`);
				return [match[2].slice(2), match[1]];
			}),
	);
	const actual = filesUnder(root)
		.filter(function skipSums(path) {
			return path !== inventoryPath;
		})
		.map(function relativePath(path) {
			return relative(root, path).replaceAll('\\', '/');
		})
		.sort();
	if (
		actual.length !== expected.size ||
		actual.some(function missing(path) {
			return !expected.has(path);
		})
	) {
		throw new Error('vendored file inventory drifted from the pinned release');
	}
	for (const path of actual) {
		if (digest(join(root, path)) !== expected.get(path)) {
			throw new Error(`vendored byte drift: ${path}`);
		}
	}
	const required = [
		'LICENSE',
		'packages/animated/src/createHost.ts',
		'packages/core/src/index.ts',
		'packages/core/src/SpringValue.test.ts',
		'packages/parallax/src/index.tsx',
		'packages/shared/src/index.ts',
		'packages/types/src/index.ts',
		'targets/web/src/index.ts',
		'targets/web/src/animated.test.tsx',
	];
	for (const path of required) {
		if (!expected.has(path)) throw new Error(`required upstream boundary is missing: ${path}`);
	}

	const manifestPath = join(repoRoot, 'packages/react-spring/audit/react-parity.json');
	if (!existsSync(manifestPath)) {
		throw new Error('react-parity manifest is missing');
	}
	const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
	const adaptedLane = manifest.lanes.find(function findAdapted(lane) {
		return (
			lane.type === 'adapted-octane' &&
			lane.execution?.kind === 'vitest-full' &&
			lane.oracle === 'required'
		);
	});
	if (adaptedLane === undefined) {
		throw new Error('react-parity manifest lacks a required adapted-octane vitest-full lane');
	}
	const adaptedInventory = loadInventory(repoRoot, adaptedLane.execution.inventory);
	const inventoriedFiles = new Set(adaptedInventory.files);
	const inventoriedByFile = new Map();
	for (const test of adaptedInventory.tests) {
		const list = inventoriedByFile.get(test.file) ?? [];
		list.push(test);
		inventoriedByFile.set(test.file, list);
	}

	const testFiles = actual.filter(function isTest(path) {
		return /\.test(?:-d)?\.tsx?$/.test(path);
	});
	const dispositionsPath = join(
		repoRoot,
		'packages/react-spring/audit/upstream-test-dispositions.json',
	);
	if (!existsSync(dispositionsPath)) throw new Error('upstream test dispositions are missing');
	const dispositions = JSON.parse(readFileSync(dispositionsPath, 'utf8'));
	const dispositionFiles = Object.keys(dispositions).sort();
	if (
		dispositionFiles.length !== testFiles.length ||
		dispositionFiles.some(function drifted(path, index) {
			return path !== testFiles[index];
		})
	) {
		throw new Error('upstream test disposition inventory drifted');
	}

	for (const [path, disposition] of Object.entries(dispositions)) {
		if (!['adapted', 'adapted-types', 'reused-dependency'].includes(disposition.disposition)) {
			throw new Error(`invalid upstream test disposition: ${path}`);
		}
		if (!Array.isArray(disposition.evidence) || disposition.evidence.length === 0) {
			throw new Error(`upstream test disposition lacks evidence: ${path}`);
		}
		for (const evidence of disposition.evidence) {
			const evidencePath = join(repoRoot, 'packages/react-spring', evidence);
			if (!existsSync(evidencePath)) {
				throw new Error(`upstream test evidence is missing: ${path} -> ${evidence}`);
			}
			if (disposition.disposition !== 'adapted') continue;
			if (evidence === 'package.json' || evidence.startsWith('typetests/')) continue;
			const repoRelative = `packages/react-spring/${evidence}`;
			if (evidence.startsWith('tests/browser/')) continue;
			if (!inventoriedFiles.has(repoRelative)) {
				throw new Error(
					`adapted evidence is not inventoried for case-level execution: ${path} -> ${evidence}`,
				);
			}
			const source = readFileSync(evidencePath, 'utf8');
			if (source.trim().length === 0) {
				throw new Error(`adapted evidence file is empty: ${evidence}`);
			}
			const perComments = collectPerComments(source);
			if (perComments.length === 0) {
				throw new Error(`adapted evidence lacks // Per provenance: ${evidence}`);
			}
			const citesUpstream = perComments.some(function cites(comment) {
				return comment.path === path;
			});
			if (!citesUpstream) {
				throw new Error(`adapted evidence does not cite upstream case ${path}: ${evidence}`);
			}
			for (const comment of perComments) {
				const upstreamAbsolute = join(repoRoot, ROOT, comment.path);
				if (!existsSync(upstreamAbsolute)) {
					throw new Error(
						`// Per provenance points at a missing upstream file: ${evidence} -> ${comment.path}`,
					);
				}
				const upstreamLines = readFileSync(upstreamAbsolute, 'utf8').split('\n');
				if (comment.line < 1 || comment.line > upstreamLines.length) {
					throw new Error(
						`// Per provenance line is out of range: ${evidence} -> ${comment.path}:${comment.line}`,
					);
				}
			}
			const cases = inventoriedByFile.get(repoRelative) ?? [];
			if (cases.length === 0) {
				throw new Error(`inventoried evidence has zero case identities: ${evidence}`);
			}
			const skippedIts = [...source.matchAll(/^\s*it\.(skip|todo)\s*\(/gm)].length;
			if (skippedIts > 0) {
				throw new Error(`adapted evidence contains skipped cases: ${evidence}`);
			}
			const compactSource = source.replace(/\s+/g, '');
			for (const parityCase of cases) {
				const tokens = parityCase.fullName.split(' ');
				const candidates = [
					parityCase.fullName,
					tokens.slice(-8).join(' '),
					tokens.at(-1)?.replace(/^["']|["']$/g, ''),
				].filter(Boolean);
				if (
					!candidates.some(function present(candidate) {
						return (
							source.includes(candidate) || compactSource.includes(candidate.replace(/\s+/g, ''))
						);
					})
				) {
					throw new Error(
						`inventoried case is missing from adapted evidence source: ${evidence} -> ${parityCase.fullName}`,
					);
				}
			}
		}
	}

	const runtimeSource = filesUnder(join(repoRoot, 'packages/react-spring/src'));
	for (const path of runtimeSource) {
		if (/from\s+['"](?:react|react-dom)(?:\/|['"])/.test(readFileSync(path, 'utf8'))) {
			throw new Error(`React import leaked into published source: ${relative(repoRoot, path)}`);
		}
	}
	return {
		files: actual.length,
		checksum: digest(inventoryPath),
		testDispositions: testFiles.length,
		adaptedCases: adaptedInventory.tests.length,
	};
}
