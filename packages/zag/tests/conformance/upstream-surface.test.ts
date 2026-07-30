import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import * as zag from '@octanejs/zag';

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '../..');

describe('@zag-js/react public surface', () => {
	it('provides the stable exports from @zag-js/react@1.42.0', () => {
		expect(Object.keys(zag).sort()).toEqual(
			['Portal', 'mergeProps', 'normalizeProps', 'useMachine', 'useSyncExternalStore'].sort(),
		);
	});

	it('keeps React out of the published dependency and source graphs', () => {
		const manifest = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8'));
		expect(manifest.dependencies).not.toHaveProperty('react');
		expect(manifest.dependencies).not.toHaveProperty('react-dom');

		const source = readdirSync(join(packageRoot, 'src'))
			.filter((file) => file.endsWith('.ts'))
			.map((file) => readFileSync(join(packageRoot, 'src', file), 'utf8'))
			.join('\n');
		expect(source).not.toMatch(/from ['"]react(?:-dom)?(?:\/[^'"]*)?['"]/);
	});

	it('maps React-style change handlers to Octane input handlers', () => {
		const onChange = () => {};
		const ref = () => {};
		const normalized = zag.normalizeProps.input({ onChange, ref });

		expect(normalized).not.toHaveProperty('onChange');
		expect(normalized.onInput).toBe(onChange);
		expect(normalized.ref).toBe(ref);
	});
});
