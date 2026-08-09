#!/usr/bin/env node

/**
 * Insert or refresh case-level // Per citations on the adapted waypoint browser suite.
 *
 * Usage:
 *   node scripts/react-parity/waypoint-browser-cite.mjs
 *   node scripts/react-parity/waypoint-browser-cite.mjs --check
 *   node scripts/react-parity/waypoint-browser-cite.mjs --refresh-lock
 */

import { writeFileSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
	ADAPTED_BROWSER_SUITE,
	ADAPTED_BROWSER_SUITE_LOCK,
	UPSTREAM_BROWSER_SUITE,
	citationForLine,
	extractBrowserCases,
	listMissingCitations,
	renderAdaptedBrowserSuiteLock,
} from './waypoint-browser-suite-lib.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const args = new Set(process.argv.slice(2));
const checkOnly = args.has('--check');
const refreshLock = args.has('--refresh-lock');

function indentOfLine(source, offset) {
	const lineStart = source.lastIndexOf('\n', offset - 1) + 1;
	const match = source.slice(lineStart, offset).match(/^\s*/);
	return match ? match[0] : '';
}

function applyCitations(adaptedSource, upstreamCases) {
	const adaptedCases = extractBrowserCases(adaptedSource);
	if (adaptedCases.length !== upstreamCases.length) {
		throw new Error(
			`case count mismatch: upstream ${upstreamCases.length} vs adapted ${adaptedCases.length}`,
		);
	}

	const insertions = [];
	let updated = 0;
	let inserted = 0;

	for (let index = 0; index < adaptedCases.length; index++) {
		const adapted = adaptedCases[index];
		const upstream = upstreamCases[index];
		const citation = citationForLine(upstream.line);
		const indent = indentOfLine(adaptedSource, adapted.start);
		const desired = `${indent}${citation}`;
		const before = adaptedSource.slice(0, adapted.start);
		const lineStart = before.lastIndexOf('\n') + 1;
		const previousLineStart = before.lastIndexOf('\n', Math.max(0, lineStart - 2)) + 1;
		const previousLine = before.slice(previousLineStart, lineStart).replace(/\s+$/, '');
		const citationPattern =
			/^(\s*)\/\/\s*Per\s+packages\/waypoint\/upstream\/test\/browser\/waypoint_test\.jsx:\d+$/;

		if (citationPattern.test(previousLine)) {
			if (previousLine !== desired) {
				insertions.push({
					kind: 'replace',
					start: previousLineStart,
					end: lineStart,
					text: `${desired}\n`,
				});
				updated++;
			}
			continue;
		}

		insertions.push({
			kind: 'insert',
			start: lineStart,
			end: lineStart,
			text: `${desired}\n`,
		});
		inserted++;
	}

	let next = adaptedSource;
	for (const change of insertions.sort(function byStartDesc(a, b) {
		return b.start - a.start;
	})) {
		next = `${next.slice(0, change.start)}${change.text}${next.slice(change.end)}`;
	}

	return { source: next, inserted, updated, total: adaptedCases.length };
}

function main() {
	const upstreamPath = resolve(REPO, UPSTREAM_BROWSER_SUITE);
	const adaptedPath = resolve(REPO, ADAPTED_BROWSER_SUITE);
	const upstreamSource = readFileSync(upstreamPath, 'utf8');
	const adaptedSource = readFileSync(adaptedPath, 'utf8');
	const upstreamCases = extractBrowserCases(upstreamSource);

	if (checkOnly) {
		const missing = listMissingCitations(adaptedSource);
		if (missing.length > 0) {
			console.error(`Missing ${missing.length} case-level // Per citation(s).`);
			process.exit(1);
		}
		console.log(`All ${upstreamCases.length} adapted browser cases have // Per citations.`);
		return;
	}

	const result = applyCitations(adaptedSource, upstreamCases);
	if (result.source !== adaptedSource) {
		writeFileSync(adaptedPath, result.source);
	}

	if (refreshLock || result.source !== adaptedSource) {
		const lock = renderAdaptedBrowserSuiteLock(REPO);
		writeFileSync(
			resolve(REPO, ADAPTED_BROWSER_SUITE_LOCK),
			`${JSON.stringify(lock, null, '\t')}\n`,
		);
	}

	console.log(
		`waypoint browser citations: ${result.inserted} inserted, ${result.updated} updated, ${result.total} total`,
	);
}

main();
