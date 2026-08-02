import assert from 'node:assert/strict';
import {
	cpSync,
	existsSync,
	mkdtempSync,
	mkdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { verifyReactSpringUpstream } from './react-spring-upstream-lib.mjs';

const source = new URL('../../packages/react-spring/upstream', import.meta.url);

function fixture() {
	const root = mkdtempSync(join(tmpdir(), 'react-spring-upstream-'));
	const target = join(root, 'packages/react-spring/upstream');
	cpSync(source, target, { recursive: true });
	mkdirSync(join(root, 'packages/react-spring/audit'), { recursive: true });
	cpSync(
		new URL('../../packages/react-spring/audit/upstream-test-dispositions.json', import.meta.url),
		join(root, 'packages/react-spring/audit/upstream-test-dispositions.json'),
	);
	cpSync(
		new URL('../../packages/react-spring/src', import.meta.url),
		join(root, 'packages/react-spring/src'),
		{
			recursive: true,
		},
	);
	for (const disposition of Object.values(
		JSON.parse(
			readFileSync(
				new URL(
					'../../packages/react-spring/audit/upstream-test-dispositions.json',
					import.meta.url,
				),
				'utf8',
			),
		),
	)) {
		for (const evidence of disposition.evidence) {
			const path = join(root, 'packages/react-spring', evidence);
			mkdirSync(dirname(path), { recursive: true });
			if (!existsSync(path)) writeFileSync(path, 'fixture\n');
		}
	}
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
