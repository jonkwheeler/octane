import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';

// prettier-ignore
// @ts-expect-error parity runner is plain ESM without declaration emit
import { floatingUiInventory, runFloatingUiUpstreamSuite } from '../../../../scripts/react-parity/floating-ui-upstream-runtime.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');

it('runs every paired upstream assertion against Octane', () => {
	const expected = JSON.parse(
		readFileSync(resolve(repoRoot, 'packages/floating-ui/audit/adapted-runtime.json'), 'utf8'),
	);
	const result = runFloatingUiUpstreamSuite('adapted');
	const output = `${result.stdout}\n${result.stderr}`;
	expect(result.status, output).toBe(0);
	expect(floatingUiInventory('adapted', result.identities)).toEqual(expected);
}, 120_000);
