import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { verifyReactSpringUpstream } from './react-spring-upstream-lib.mjs';

const source = new URL('../../packages/react-spring/upstream', import.meta.url);

function fixture() {
	const root = mkdtempSync(join(tmpdir(), 'react-spring-upstream-'));
	const target = join(root, 'packages/react-spring/upstream');
	cpSync(source, target, { recursive: true });
	return { root, target };
}

test('accepts the pinned byte-exact upstream tree', () => {
	const { root } = fixture();
	try {
		assert.equal(verifyReactSpringUpstream(root).files, 167);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test('rejects modified upstream bytes', () => {
	const { root, target } = fixture();
	try {
		writeFileSync(join(target, 'packages/core/src/index.ts'), 'export {}\n');
		assert.throws(() => verifyReactSpringUpstream(root), /vendored byte drift/);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test('rejects missing upstream evidence', () => {
	const { root, target } = fixture();
	try {
		rmSync(join(target, 'targets/web/src/animated.test.tsx'));
		assert.throws(() => verifyReactSpringUpstream(root), /inventory drifted/);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});
