import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, test } from 'node:test';

const repo = path.resolve(import.meta.dirname, '../..');
const packageRoot = path.join(repo, 'packages/react-resizable-panels');

describe('react-resizable-panels public type parity evidence', () => {
	test('strict Octane public probes compile with their negative assertions', () => {
		execFileSync(
			path.join(repo, 'node_modules/.bin/tsrx-tsc'),
			['--noEmit', '-p', path.join(packageRoot, 'audit/type-probes/tsconfig.json')],
			{ cwd: repo, stdio: 'inherit' },
		);
	});

	test('the entry point explicitly exports exactly the pinned public types', () => {
		const expected = JSON.parse(
			readFileSync(path.join(packageRoot, 'audit/public-api.json'), 'utf8'),
		).types.sort();
		const source = readFileSync(path.join(packageRoot, 'src/index.tsrx'), 'utf8');
		const actual = [...source.matchAll(/export\s+type\s*\{([^}]+)\}\s*from/gs)]
			.flatMap((match) =>
				match[1]
					.split(',')
					.map((name) => name.trim())
					.filter(Boolean),
			)
			.sort();
		assert.deepEqual(actual, expected);
		assert.doesNotMatch(source, /export\s+type\s+\*/);
	});
});
