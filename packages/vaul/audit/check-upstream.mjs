import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const auditDir = dirname(fileURLToPath(import.meta.url));
const packageDir = resolve(auditDir, '..');
const workspaceRoot = resolve(packageDir, '../..');
const upstreamDir = join(packageDir, 'upstream');
const evidence = JSON.parse(await readFile(join(auditDir, 'upstream-integrity.json'), 'utf8'));

async function filesUnder(directory) {
	const entries = await readdir(directory, { withFileTypes: true });
	const paths = [];
	for (const entry of entries) {
		const path = join(directory, entry.name);
		if (entry.isDirectory()) paths.push(...(await filesUnder(path)));
		else if (entry.isFile()) paths.push(path);
	}
	return paths;
}

const files = (await filesUnder(upstreamDir)).sort((a, b) => {
	const left = relative(workspaceRoot, a);
	const right = relative(workspaceRoot, b);
	return left < right ? -1 : left > right ? 1 : 0;
});
const lines = [];
for (const file of files) {
	const digest = createHash('sha256')
		.update(await readFile(file))
		.digest('hex');
	lines.push(`${digest}  ${relative(workspaceRoot, file)}`);
}
const treeSha256 = createHash('sha256')
	.update(`${lines.join('\n')}\n`)
	.digest('hex');

if (files.length !== evidence.fileCount || treeSha256 !== evidence.treeSha256) {
	console.error(
		`Vaul upstream evidence mismatch: expected ${evidence.fileCount}/${evidence.treeSha256}, got ${files.length}/${treeSha256}`,
	);
	process.exit(1);
}

const license = await readFile(join(upstreamDir, 'LICENSE.md'), 'utf8');
if (!license.includes('MIT License') || !license.includes('Copyright (c) 2023 Emil Kowalski')) {
	console.error('Vaul license evidence does not contain the pinned MIT notice.');
	process.exit(1);
}

console.log(`vaul ${evidence.version} upstream evidence verified (${files.length} files)`);
