import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const upstreamRoot = join(packageRoot, 'upstream');
const runRoot = mkdtempSync(join(packageRoot, '.pristine-upstream-'));

try {
	cpSync(join(upstreamRoot, 'src'), join(runRoot, 'src'), { recursive: true });
	cpSync(join(upstreamRoot, 'test'), join(runRoot, 'test'), { recursive: true });
	writeFileSync(
		join(runRoot, 'tsconfig.json'),
		JSON.stringify({
			compilerOptions: {
				esModuleInterop: true,
				jsx: 'react-jsx',
				jsxImportSource: 'react',
				module: 'ESNext',
				moduleResolution: 'Bundler',
				target: 'ES2020',
			},
		}),
	);

	const result = spawnSync(
		join(packageRoot, 'node_modules/.bin/vitest'),
		['run', '--config', join(packageRoot, 'tests/upstream-vitest.config.ts')],
		{
			cwd: packageRoot,
			env: { ...process.env, LIVESTORE_PRISTINE_ROOT: runRoot },
			stdio: 'inherit',
		},
	);
	process.exitCode = result.status ?? 1;
} finally {
	rmSync(runRoot, { recursive: true, force: true });
}
