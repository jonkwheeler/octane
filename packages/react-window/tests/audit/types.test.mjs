import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const repoRoot = resolve(packageRoot, '../..');

function reject(compiler, project) {
	const result = spawnSync(
		resolve(repoRoot, `node_modules/.bin/${compiler}`),
		['--noEmit', '-p', project],
		{
			cwd: repoRoot,
			encoding: 'utf8',
		},
	);
	assert.notEqual(result.status, 0, `${compiler} unexpectedly accepted the negative type fixture`);
	assert.match(
		`${result.stdout}\n${result.stderr}`,
		/Property 'columnIndex' is missing|columnIndex.*missing/,
	);
}

test('the pristine declaration oracle rejects a missing Grid coordinate', () => {
	reject('tsc', 'packages/react-window/typetests/tsconfig.negative-pristine.json');
});

test('the adapted declaration surface rejects the same missing Grid coordinate', () => {
	reject('tsrx-tsc', 'packages/react-window/typetests/tsconfig.negative-adapted.json');
});
