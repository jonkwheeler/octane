import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export const UPSTREAM_BROWSER_SUITE = 'packages/waypoint/upstream/test/browser/waypoint_test.jsx';
export const ADAPTED_BROWSER_SUITE =
	'packages/waypoint/tests/browser/adapted/harness/waypoint_adapted_suite.jsx';
export const ADAPTED_BROWSER_SUITE_LOCK = 'packages/waypoint/audit/adapted-browser-suite.json';
export const ALLOWED_TRANSFORMS_DOC =
	'packages/waypoint/tests/browser/adapted/ALLOWED_TRANSFORMS.md';
export const UPSTREAM_CITATION_PREFIX =
	'// Per packages/waypoint/upstream/test/browser/waypoint_test.jsx:';

/**
 * Documented per-case expect matcher replacements (adapted may diverge).
 * Keys are exact it() titles.
 */
export const ALLOWED_EXPECT_TRANSFORMS = new Map([
	[
		'does not throw with a Stateful Component as a child',
		{ from: ['.not.toThrow'], to: ['.not.toThrow', '.toHaveBeenCalled'] },
	],
	[
		'does not throw with a Stateless Component as a child',
		{ from: ['.not.toThrow'], to: ['.not.toThrow', '.toHaveBeenCalled'] },
	],
	[
		'errors when a Stateful Component does not provide ref to Waypoint',
		{ from: ['.toThrowError'], to: ['.not.toThrow'] },
	],
	[
		'errors when a Stateless Component does not provide ref to Waypoint',
		{ from: ['.toThrowError'], to: ['.not.toThrow'] },
	],
]);

/**
 * Documented per-case fixture marker replacements (prelude + body).
 */
export const ALLOWED_FIXTURE_TRANSFORMS = new Map([
	['only calls onEnter once', { from: ['forceUpdate'], to: ['useState'] }],
]);

function sha256(value) {
	return createHash('sha256').update(value).digest('hex');
}

function lineNumberAt(source, offset) {
	let line = 1;
	for (let index = 0; index < offset; index++) {
		if (source.charCodeAt(index) === 10) line++;
	}
	return line;
}

function skipString(source, start) {
	const quote = source[start];
	let index = start + 1;
	let escaped = false;
	while (index < source.length) {
		const char = source[index];
		if (escaped) {
			escaped = false;
			index++;
			continue;
		}
		if (char === '\\') {
			escaped = true;
			index++;
			continue;
		}
		if (char === quote) return index + 1;
		index++;
	}
	return source.length;
}

function matchBalanced(source, openIndex, openChar, closeChar) {
	let depth = 0;
	let index = openIndex;
	while (index < source.length) {
		const char = source[index];
		if (char === '"' || char === "'" || char === '`') {
			index = skipString(source, index);
			continue;
		}
		if (char === '/' && source[index + 1] === '/') {
			const newline = source.indexOf('\n', index + 2);
			index = newline === -1 ? source.length : newline + 1;
			continue;
		}
		if (char === '/' && source[index + 1] === '*') {
			const close = source.indexOf('*/', index + 2);
			index = close === -1 ? source.length : close + 2;
			continue;
		}
		if (char === openChar) {
			depth++;
			index++;
			continue;
		}
		if (char === closeChar) {
			depth--;
			index++;
			if (depth === 0) return index;
			continue;
		}
		index++;
	}
	return -1;
}

function stripComments(source) {
	let out = '';
	let index = 0;
	while (index < source.length) {
		const char = source[index];
		if (char === '"' || char === "'" || char === '`') {
			const end = skipString(source, index);
			out += source.slice(index, end);
			index = end;
			continue;
		}
		if (char === '/' && source[index + 1] === '/') {
			const newline = source.indexOf('\n', index + 2);
			index = newline === -1 ? source.length : newline;
			continue;
		}
		if (char === '/' && source[index + 1] === '*') {
			const close = source.indexOf('*/', index + 2);
			index = close === -1 ? source.length : close + 2;
			continue;
		}
		out += char;
		index++;
	}
	return out;
}

export function extractExpectMatchers(body) {
	const matchers = [];
	let index = 0;
	while (index < body.length) {
		const start = body.indexOf('expect(', index);
		if (start === -1) break;
		const argsEnd = matchBalanced(body, start + 'expect'.length, '(', ')');
		if (argsEnd === -1) break;
		const rest = body.slice(argsEnd).match(/^\s*((?:\.\s*not\s*)?\.\s*[a-zA-Z_]\w*)/);
		if (rest) {
			matchers.push(rest[1].replace(/\s+/g, ''));
		}
		index = argsEnd;
	}
	return matchers;
}

export function extractFixtureMarkers(source) {
	const code = stripComments(source);
	const markers = [];
	if (/\bforceUpdate\s*\(/.test(code)) markers.push('forceUpdate');
	if (/\bsetState\s*\(/.test(code)) markers.push('setState');
	if (/\buseState\s*\(/.test(code)) markers.push('useState');
	return markers;
}

/**
 * Extract Jasmine it() cases with title, line, expects, and fixture markers.
 * Fixture markers are taken from the prelude (text since the previous case) plus the it body,
 * so describe-level beforeEach setup (e.g. forceUpdate) is visible.
 */
export function extractBrowserCases(source) {
	const cases = [];
	const itPattern = /\bit\(\s*(['"])([\s\S]*?)\1\s*,/g;
	let match;
	let previousEnd = 0;
	while ((match = itPattern.exec(source)) !== null) {
		const title = match[2];
		const itStart = match.index;
		let cursor = match.index + match[0].length;
		while (cursor < source.length && /\s/.test(source[cursor])) cursor++;
		// Optional named function: function name(done) {
		if (source.startsWith('function', cursor)) {
			const brace = source.indexOf('{', cursor);
			if (brace === -1) continue;
			cursor = brace;
		} else if (source[cursor] === '(') {
			// arrow with params already consumed by pattern's trailing comma path — find {
			const brace = source.indexOf('{', cursor);
			if (brace === -1) continue;
			cursor = brace;
		} else if (source[cursor] !== '{') {
			const brace = source.indexOf('{', cursor);
			if (brace === -1 || brace - cursor > 120) continue;
			cursor = brace;
		}
		const bodyEnd = matchBalanced(source, cursor, '{', '}');
		if (bodyEnd === -1) continue;
		const body = source.slice(cursor, bodyEnd);
		const prelude = source.slice(previousEnd, itStart);
		const expects = extractExpectMatchers(body);
		const fixtures = extractFixtureMarkers(`${prelude}\n${body}`);
		cases.push({
			title,
			line: lineNumberAt(source, itStart),
			start: itStart,
			end: bodyEnd,
			expects,
			fixtures,
		});
		previousEnd = bodyEnd;
		itPattern.lastIndex = bodyEnd;
	}
	return cases;
}

export function citationForLine(line) {
	return `${UPSTREAM_CITATION_PREFIX}${line}`;
}

export function priorCitationLine(adaptedSource, caseStart) {
	const before = adaptedSource.slice(0, caseStart);
	const lineStart = before.lastIndexOf('\n') + 1;
	const previousLineStart = before.lastIndexOf('\n', Math.max(0, lineStart - 2)) + 1;
	return before.slice(previousLineStart, lineStart).replace(/\s+$/, '');
}

export function listMissingCitations(adaptedSource) {
	const cases = extractBrowserCases(adaptedSource);
	const missing = [];
	for (const testCase of cases) {
		const prior = priorCitationLine(adaptedSource, testCase.start);
		if (
			!/\/\/\s*Per\s+packages\/waypoint\/upstream\/test\/browser\/waypoint_test\.jsx:\d+$/.test(
				prior,
			)
		) {
			missing.push(testCase.title);
		}
	}
	return missing;
}

function normalizeExpects(title, expects) {
	const transform = ALLOWED_EXPECT_TRANSFORMS.get(title);
	if (!transform) return expects;
	if (JSON.stringify(expects) !== JSON.stringify(transform.from)) return expects;
	return transform.to;
}

function normalizeFixtures(title, fixtures) {
	const transform = ALLOWED_FIXTURE_TRANSFORMS.get(title);
	if (!transform) return fixtures;
	if (JSON.stringify(fixtures) !== JSON.stringify(transform.from)) return fixtures;
	return transform.to;
}

export function buildBrowserSuiteInventory(root) {
	const upstreamPath = resolve(root, UPSTREAM_BROWSER_SUITE);
	const adaptedPath = resolve(root, ADAPTED_BROWSER_SUITE);
	if (!existsSync(upstreamPath))
		throw new Error(`missing upstream suite: ${UPSTREAM_BROWSER_SUITE}`);
	if (!existsSync(adaptedPath)) throw new Error(`missing adapted suite: ${ADAPTED_BROWSER_SUITE}`);
	const upstreamSource = readFileSync(upstreamPath, 'utf8');
	const adaptedSource = readFileSync(adaptedPath, 'utf8');
	const upstreamCases = extractBrowserCases(upstreamSource);
	const adaptedCases = extractBrowserCases(adaptedSource);
	return {
		upstreamSource,
		adaptedSource,
		upstreamCases,
		adaptedCases,
		adaptedSha256: sha256(adaptedSource),
	};
}

export function renderAdaptedBrowserSuiteLock(root) {
	const inventory = buildBrowserSuiteInventory(root);
	return {
		schemaVersion: 1,
		adaptedSuite: ADAPTED_BROWSER_SUITE,
		upstreamSuite: UPSTREAM_BROWSER_SUITE,
		caseCount: inventory.adaptedCases.length,
		sha256: inventory.adaptedSha256,
	};
}

export function verifyWaypointBrowserSuite(root) {
	const transformsPath = resolve(root, ALLOWED_TRANSFORMS_DOC);
	if (!existsSync(transformsPath)) {
		throw new Error(`missing allowed transforms doc: ${ALLOWED_TRANSFORMS_DOC}`);
	}
	const transformsDoc = readFileSync(transformsPath, 'utf8');
	for (const title of ALLOWED_EXPECT_TRANSFORMS.keys()) {
		if (!transformsDoc.includes(title)) {
			throw new Error(`ALLOWED_TRANSFORMS.md must document expect transform for: ${title}`);
		}
	}
	for (const title of ALLOWED_FIXTURE_TRANSFORMS.keys()) {
		if (!transformsDoc.includes(title)) {
			throw new Error(`ALLOWED_TRANSFORMS.md must document fixture transform for: ${title}`);
		}
	}

	const inventory = buildBrowserSuiteInventory(root);
	const { upstreamCases, adaptedCases, adaptedSource, adaptedSha256 } = inventory;

	if (upstreamCases.length !== adaptedCases.length) {
		throw new Error(
			`browser suite case count drifted: upstream ${upstreamCases.length} vs adapted ${adaptedCases.length}`,
		);
	}

	const missingCitations = listMissingCitations(adaptedSource);
	if (missingCitations.length > 0) {
		throw new Error(
			`adapted browser suite is missing // Per citations on ${missingCitations.length} case(s); run waypoint-browser-cite.mjs`,
		);
	}

	for (let index = 0; index < upstreamCases.length; index++) {
		const upstream = upstreamCases[index];
		const adapted = adaptedCases[index];
		if (upstream.title !== adapted.title) {
			throw new Error(
				`browser suite title order drifted at index ${index}: ${JSON.stringify(upstream.title)} vs ${JSON.stringify(adapted.title)}`,
			);
		}
		const expectedExpects = normalizeExpects(upstream.title, upstream.expects);
		if (JSON.stringify(expectedExpects) !== JSON.stringify(adapted.expects)) {
			throw new Error(
				`${upstream.title}: expect fingerprints diverged beyond ALLOWED_TRANSFORMS (upstream ${JSON.stringify(upstream.expects)} → adapted ${JSON.stringify(adapted.expects)})`,
			);
		}
		const expectedFixtures = normalizeFixtures(upstream.title, upstream.fixtures);
		if (JSON.stringify(expectedFixtures) !== JSON.stringify(adapted.fixtures)) {
			throw new Error(
				`${upstream.title}: fixture markers diverged beyond ALLOWED_TRANSFORMS (upstream ${JSON.stringify(upstream.fixtures)} → adapted ${JSON.stringify(adapted.fixtures)})`,
			);
		}
	}

	const lockPath = resolve(root, ADAPTED_BROWSER_SUITE_LOCK);
	if (!existsSync(lockPath)) {
		throw new Error(`missing adapted browser suite lock: ${ADAPTED_BROWSER_SUITE_LOCK}`);
	}
	const lock = JSON.parse(readFileSync(lockPath, 'utf8'));
	if (lock.sha256 !== adaptedSha256) {
		throw new Error(
			`adapted browser suite SHA256 drifted; review ALLOWED_TRANSFORMS and refresh ${ADAPTED_BROWSER_SUITE_LOCK}`,
		);
	}
	if (lock.caseCount !== adaptedCases.length) {
		throw new Error(
			`adapted browser suite lock caseCount drifted (${lock.caseCount} vs ${adaptedCases.length})`,
		);
	}

	return {
		cases: adaptedCases.length,
		sha256: adaptedSha256,
	};
}
