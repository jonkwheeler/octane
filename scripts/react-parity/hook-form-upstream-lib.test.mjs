import assert from 'node:assert/strict';
import { mkdir, mkdtemp, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
	renderHookFormAdaptedInventory,
	renderHookFormUpstreamInventory,
	verifyHookFormUpstream,
} from './hook-form-upstream-lib.mjs';

async function fixture() {
	const root = await mkdtemp(join(tmpdir(), 'hook-form-upstream-'));
	const upstreamTests = join(root, 'packages/hook-form/upstream/src/__tests__');
	const portedTests = join(root, 'packages/hook-form/tests/upstream');
	await mkdir(upstreamTests, { recursive: true });
	await mkdir(portedTests, { recursive: true });
	await writeFile(join(upstreamTests, 'example.test.ts'), "it('same behavior', () => {});\n");
	await writeFile(join(portedTests, 'example.test.ts'), "it('same behavior', () => {});\n");
	await writeFile(join(upstreamTests, 'example.test.ts.snap'), 'snapshot\n');
	await writeFile(join(portedTests, 'example.test.ts.snap'), 'snapshot\n');
	await writeFile(
		join(root, 'packages/hook-form/upstream/SHA256SUMS'),
		renderHookFormUpstreamInventory(root),
	);
	await mkdir(join(root, 'packages/hook-form/audit'), { recursive: true });
	await writeFile(
		join(root, 'packages/hook-form/audit/upstream-adapted.SHA256SUMS'),
		renderHookFormAdaptedInventory(root),
	);
	return { portedTests, root, upstreamTests };
}

test('accepts an intact byte-locked one-for-one adapted suite', async () => {
	const { root } = await fixture();
	assert.deepEqual(verifyHookFormUpstream(root), {
		artifacts: 2,
		portedCases: 1,
		upstreamCases: 1,
	});
});

test('rejects vendored byte drift', async () => {
	const { root, upstreamTests } = await fixture();
	await writeFile(join(upstreamTests, 'example.test.ts'), "it('changed', () => {});\n");
	assert.throws(() => verifyHookFormUpstream(root), /upstream inventory drifted/);
});

test('rejects a missing adapted artifact', async () => {
	const { portedTests, root } = await fixture();
	await unlink(join(portedTests, 'example.test.ts.snap'));
	assert.throws(() => verifyHookFormUpstream(root), /account for every upstream test artifact/);
});

test('rejects an unrecorded adapted title change', async () => {
	const { portedTests, root } = await fixture();
	await writeFile(join(portedTests, 'example.test.ts'), "it('different behavior', () => {});\n");
	assert.throws(() => verifyHookFormUpstream(root), /test registrations drifted/);
});

test('rejects disabled, focused, or expected-failing adapted tests', async () => {
	for (const registration of [
		'describe.skip',
		'it.todo',
		'test.failing',
		'it.only',
		'fit',
		'xit',
	]) {
		const { portedTests, root } = await fixture();
		await writeFile(
			join(portedTests, 'example.test.ts'),
			`${registration}('same behavior', () => {});\n`,
		);
		assert.throws(
			() => verifyHookFormUpstream(root),
			/focused, failing, skip, or todo markers/,
			registration,
		);
	}
});

test('rejects adapted assertion or callback drift even when the title is unchanged', async () => {
	const { portedTests, root } = await fixture();
	await writeFile(
		join(portedTests, 'example.test.ts'),
		"it('same behavior', () => {}); // drift\n",
	);
	assert.throws(() => verifyHookFormUpstream(root), /adapted test inventory drifted/);
});
