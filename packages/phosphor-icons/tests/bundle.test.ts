// @vitest-environment node
import { build } from 'esbuild';
import { describe, expect, it } from 'vitest';

describe('@octanejs/phosphor-icons — tree shaking', () => {
	it('includes only the imported icon module in a per-icon bundle', async () => {
		const result = await build({
			stdin: {
				contents: "export { Camera } from './src/icons/camera.ts';",
				resolveDir: new URL('..', import.meta.url).pathname,
				loader: 'ts',
			},
			bundle: true,
			format: 'esm',
			platform: 'browser',
			external: ['octane'],
			metafile: true,
			write: false,
		});
		const inputs = Object.keys(Object.values(result.metafile.outputs)[0].inputs);
		expect(inputs.some((path) => path.endsWith('src/icons/camera.ts'))).toBe(true);
		expect(inputs.some((path) => path.endsWith('src/icons/alarm.ts'))).toBe(false);
		expect(inputs.some((path) => path.includes('@phosphor-icons/core'))).toBe(false);
	});
});
