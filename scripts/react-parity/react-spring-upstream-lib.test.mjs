import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { verifyReactSpringUpstream } from './react-spring-upstream-lib.mjs';

function fixture() {
	const root = mkdtempSync(join(tmpdir(), 'react-spring-upstream-'));
	cpSync(
		new URL('../../packages/react-spring', import.meta.url),
		join(root, 'packages/react-spring'),
		{
			recursive: true,
		},
	);
	return { root, target: join(root, 'packages/react-spring/upstream') };
}

test('accepts the pinned byte-exact upstream tree with case-level evidence', () => {
	const { root } = fixture();
	try {
		const result = verifyReactSpringUpstream(root);
		assert.equal(result.files, 167);
		assert.ok(result.adaptedCases > 0);
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

test('rejects an unclassified upstream test file', () => {
	const { root } = fixture();
	try {
		const path = join(root, 'packages/react-spring/audit/upstream-test-dispositions.json');
		const dispositions = JSON.parse(readFileSync(path, 'utf8'));
		delete dispositions['targets/web/src/animated.test.tsx'];
		writeFileSync(path, `${JSON.stringify(dispositions, null, 2)}\n`);
		assert.throws(() => verifyReactSpringUpstream(root), /disposition inventory drifted/);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test('rejects an empty adapted evidence file', () => {
	const { root } = fixture();
	try {
		writeFileSync(join(root, 'packages/react-spring/tests/conformance/engine.test.ts'), '');
		assert.throws(() => verifyReactSpringUpstream(root), /adapted evidence file is empty/);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test('rejects adapted evidence without Per provenance', () => {
	const { root } = fixture();
	try {
		const path = join(root, 'packages/react-spring/tests/conformance/engine.test.ts');
		const sourceText = readFileSync(path, 'utf8').replaceAll(/^\s*\/\/ Per .+\n/gm, '');
		writeFileSync(path, sourceText);
		assert.throws(() => verifyReactSpringUpstream(root), /lacks \/\/ Per provenance/);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test('rejects adapted evidence that drops an inventoried case title', () => {
	const { root } = fixture();
	try {
		const path = join(root, 'packages/react-spring/tests/conformance/engine.test.ts');
		const sourceText = readFileSync(path, 'utf8').replace(
			'settles a loop without a usable from value instead of recursing',
			'renamed case that is no longer inventoried',
		);
		writeFileSync(path, sourceText);
		assert.throws(
			() => verifyReactSpringUpstream(root),
			/inventoried case is missing from adapted evidence source/,
		);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test('rejects React imports in the published source boundary', () => {
	const { root } = fixture();
	try {
		writeFileSync(
			join(root, 'packages/react-spring/src/index.ts'),
			"import React from 'react';\nexport { React };\n",
		);
		assert.throws(() => verifyReactSpringUpstream(root), /React import leaked/);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});
