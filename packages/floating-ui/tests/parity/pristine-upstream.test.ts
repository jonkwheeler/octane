import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';

// prettier-ignore
// @ts-expect-error parity runner is plain ESM without declaration emit
import { floatingUiInventory, runFloatingUiUpstreamSuite } from '../../../../scripts/react-parity/floating-ui-upstream-runtime.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');

it('runs the pinned @floating-ui/react 0.27.19 suite unchanged', () => {
	const expected = JSON.parse(
		readFileSync(resolve(repoRoot, 'packages/floating-ui/audit/pristine-runtime.json'), 'utf8'),
	);
	const result = runFloatingUiUpstreamSuite('pristine');
	const output = `${result.stdout}\n${result.stderr}`;
	expect(result.status, output).toBe(0);
	expect(floatingUiInventory('pristine', result.identities)).toEqual(expected);
}, 120_000);
