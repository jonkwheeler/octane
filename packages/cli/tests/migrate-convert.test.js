import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { compile } from '../../octane/src/compiler/index.js';
import { applyConversionPlan, createConversionPlan } from '../src/migrate/convert.js';
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

describe('migration conversion plans', () => {
	it('plans minimal runtime, binding, JSX ownership, and native text-input edits', () => {
		const project = fixture({
			'src/Leaf.tsx': `
import { useState } from 'react';
import { useSelector } from 'react-redux';
export function Leaf() {
	const [value, setValue] = useState('');
	const suffix = useSelector(() => '!');
	return <input value={value + suffix} onChange={(event) => setValue(event.currentTarget.value)} />;
}
`,
		});

		const plan = createConversionPlan({ root: project.root, entries: ['src/Leaf.tsx'] });

		expect(plan.blocked).toBe(false);
		expect(plan.files[0].output).toContain('/** @jsxImportSource octane */');
		expect(plan.files[0].output).toContain("from 'octane'");
		expect(plan.files[0].output).toContain("from '@octanejs/redux'");
		expect(plan.files[0].output).toContain('onInput=');
		expect(readFileSync(`${project.root}/src/Leaf.tsx`, 'utf8')).not.toContain('@jsxImportSource');
	});

	it('produces Octane-authored TSX accepted by the compiler', () => {
		const project = fixture({
			'src/Leaf.tsx': `
import { useState } from 'react';
export function Leaf() {
	const [value, setValue] = useState('');
	return <input value={value} onChange={(event) => setValue(event.currentTarget.value)} />;
}
`,
		});
		const plan = createConversionPlan({ root: project.root, entries: ['src/Leaf.tsx'] });

		const result = compile(plan.files[0].output, `${project.root}/src/Leaf.tsx`);

		expect(result.code).toContain("['$$input']");
		expect(result.diagnostics ?? []).toEqual([]);
	});

	it('adds a leading ownership pragma when the phrase appears only in code', () => {
		const project = fixture({
			'src/Leaf.tsx': `
const help = '@jsxImportSource octane';
export const Leaf = () => <p>{help}</p>;
`,
		});

		const plan = createConversionPlan({ root: project.root, entries: ['src/Leaf.tsx'] });

		expect(plan.blocked).toBe(false);
		expect(plan.files[0].output.startsWith('/** @jsxImportSource octane */')).toBe(true);
	});

	it('applies digest-matched files, becomes idempotent, and rejects stale plans', () => {
		const project = fixture({
			'src/Leaf.tsx': `import { useState } from 'react'; export const Leaf = () => <p />;\n`,
		});
		const plan = createConversionPlan({ root: project.root, entries: ['src/Leaf.tsx'] });

		expect(applyConversionPlan(plan)).toEqual([
			expect.objectContaining({ applied: true, conflict: false }),
		]);
		const repeated = createConversionPlan({ root: project.root, entries: ['src/Leaf.tsx'] });
		expect(repeated.blocked).toBe(false);
		expect(repeated.files[0].changed).toBe(false);

		project.write(
			'src/Other.tsx',
			`import { useState } from 'react'; export const Other = () => <p />;\n`,
		);
		const stale = createConversionPlan({ root: project.root, entries: ['src/Other.tsx'] });
		project.write('src/Other.tsx', '// human edit\n' + stale.files[0].output);
		expect(applyConversionPlan(stale)).toEqual([
			expect.objectContaining({ applied: false, conflict: true }),
		]);
	});

	it('preserves checkable onChange and blocks unknown React packages', () => {
		const project = fixture({
			'src/Leaf.tsx': `
				import { Widget } from 'react-widget';
				export const Leaf = () => <><input type="checkbox" onChange={() => {}} /><Widget /></>;
			`,
			...installed('react-widget', '1.0.0', { peerDependencies: { react: '^19' } }),
		});

		const plan = createConversionPlan({ root: project.root, entries: ['src/Leaf.tsx'] });

		expect(plan.blocked).toBe(true);
		expect(plan.files).toEqual([]);
	});
});

describe('octane migrate convert', () => {
	it('is dry-run by default and writes only with --apply', async () => {
		const project = fixture({
			'src/Leaf.tsx': `import { useState } from 'react'; export const Leaf = () => <p />;\n`,
		});
		const dry = await runCli([
			'migrate',
			'convert',
			'src/Leaf.tsx',
			'--cwd',
			project.root,
			'--json',
		]);
		expect(dry.exitCode).toBe(0);
		expect(dry.json()).toMatchObject({ applied: false, blocked: false });
		expect(readFileSync(`${project.root}/src/Leaf.tsx`, 'utf8')).not.toContain('@jsxImportSource');

		const applied = await runCli([
			'migrate',
			'convert',
			'src/Leaf.tsx',
			'--cwd',
			project.root,
			'--apply',
			'--json',
		]);
		expect(applied.exitCode).toBe(0);
		expect(readFileSync(`${project.root}/src/Leaf.tsx`, 'utf8')).toContain(
			'@jsxImportSource octane',
		);
	});
});
