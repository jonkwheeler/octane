import { afterEach, describe, expect, it } from 'vitest';
import { createFixture, installed, runCli } from './helpers/fixture.js';

const fixtures = [];

afterEach(() => {
	while (fixtures.length > 0) fixtures.pop()?.cleanup();
});

function fixture(files) {
	const created = createFixture({ 'package.json': { name: 'migration-fixture' }, ...files });
	fixtures.push(created);
	return created;
}

describe('octane migrate analyze', () => {
	it('emits the stable report model as JSON and succeeds for a supported leaf', async () => {
		const project = fixture({
			'src/Leaf.tsx': `import { useSelector } from 'react-redux'; export const Leaf = () => <p>{useSelector(() => 1)}</p>;`,
		});
		const result = await runCli([
			'migrate',
			'analyze',
			'src/Leaf.tsx',
			'--cwd',
			project.root,
			'--json',
		]);

		expect(result.exitCode).toBe(0);
		expect(result.json()).toMatchObject({
			ok: true,
			schemaVersion: 1,
			blocked: false,
		});
		expect(result.json().packages[0]).toMatchObject({
			replacement: '@octanejs/redux',
		});
	});

	it('uses the diagnostic exit code and human findings for a blocked package', async () => {
		const project = fixture({
			'src/Leaf.tsx': `import { Button } from '@mantine/core'; export const Leaf = () => <Button />;`,
			...installed('@mantine/core', '8.0.0', { peerDependencies: { react: '^19' } }),
		});
		const result = await runCli(['migrate', 'analyze', 'src/Leaf.tsx', '--cwd', project.root]);

		expect(result.exitCode).toBe(3);
		expect(result.stdout).toContain('@mantine/core has no supported Octane binding');
	});

	it('does not change the existing analyze command or its help', async () => {
		expect((await runCli(['analyze', '--help'])).stdout).toContain(
			'Compile the project and report every diagnostic',
		);
		expect((await runCli(['migrate', '--help'])).stdout).toContain(
			'analyze  Report source and dependency blockers',
		);
	});
});
