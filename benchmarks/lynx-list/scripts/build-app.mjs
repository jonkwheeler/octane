// Build the bounded list's real-native Lynx bundle with the repository's own
// Rspeedy integration. Sources are staged under the plugin example tree so
// workspace packages and the pinned Lynx toolchain resolve exactly as they do
// for the established eager-table fixture.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repo = path.resolve(root, '../..');
const STAGE_NAME = 'lynx-list-bench';

export function buildListApp({ silent = false } = {}) {
	const pluginDir = path.join(repo, 'packages/rspeedy-plugin-octane');
	const appDir = path.join(root, 'app');
	const stage = path.join(pluginDir, 'examples', STAGE_NAME);
	const output = path.join(appDir, 'dist');

	fs.rmSync(stage, { recursive: true, force: true });
	fs.mkdirSync(path.join(stage, 'src'), { recursive: true });
	for (const file of ['lynx.config.mjs', 'tsconfig.json']) {
		fs.copyFileSync(path.join(appDir, file), path.join(stage, file));
	}
	for (const file of fs.readdirSync(path.join(appDir, 'src'))) {
		fs.copyFileSync(path.join(appDir, 'src', file), path.join(stage, 'src', file));
	}

	if (!silent) console.log('[lynx-list] building bounded Native app (production)…');
	try {
		execFileSync(
			'npx',
			['rspeedy', 'build', '--root', `examples/${STAGE_NAME}`, '--environment', 'lynx'],
			{
				cwd: pluginDir,
				stdio: silent ? 'pipe' : 'inherit',
				env: { ...process.env, NODE_ENV: 'production' },
			},
		);
		const stagedOutput = path.join(stage, 'dist');
		const nativeBundle = path.join(stagedOutput, 'main.lynx.bundle');
		if (!fs.existsSync(nativeBundle)) {
			throw new Error(`Rspeedy did not emit the bounded Native bundle at ${nativeBundle}.`);
		}
		fs.rmSync(output, { recursive: true, force: true });
		fs.cpSync(stagedOutput, output, { recursive: true });
	} finally {
		fs.rmSync(stage, { recursive: true, force: true });
	}

	if (!silent) console.log('[lynx-list] staged main.lynx.bundle → app/dist');
	return output;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) buildListApp();
