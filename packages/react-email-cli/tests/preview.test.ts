import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { startPreviewServer } from '../src/preview/server.js';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repositoryRoot = resolve(packageRoot, '../..');
const temporaryDirectories: string[] = [];
const closeServers: Array<() => Promise<void>> = [];

async function fixture() {
	const root = await mkdtemp(join(tmpdir(), 'octane-email-preview-'));
	temporaryDirectories.push(root);
	const emails = join(root, 'emails');
	await mkdir(join(emails, 'static'), { recursive: true });
	await mkdir(join(root, 'node_modules', '@octanejs'), { recursive: true });
	await symlink(join(repositoryRoot, 'packages/octane'), join(root, 'node_modules/octane'), 'dir');
	await symlink(
		join(repositoryRoot, 'packages/react-email'),
		join(root, 'node_modules/@octanejs/react-email'),
		'dir',
	);
	await writeFile(join(root, 'package.json'), JSON.stringify({ type: 'module' }));
	return { emails };
}

async function preview(emails: string) {
	const server = await startPreviewServer({ directory: emails, port: 0, logLevel: 'silent' });
	closeServers.push(server.close);
	return server;
}

afterEach(async () => {
	await Promise.all(closeServers.splice(0).map((close) => close()));
	await Promise.all(temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true })));
});

describe('startPreviewServer', () => {
	it('lists templates and renders a selected email', async () => {
		const { emails } = await fixture();
		await mkdir(join(emails, 'account'));
		await writeFile(
			join(emails, 'account', 'welcome.tsrx'),
			"import { Html, Text } from '@octanejs/react-email';\nexport default function Welcome() @{ <Html><Text>{'Hello preview'}</Text></Html> }\n",
		);
		const server = await preview(emails);

		const index = await fetch(server.url).then((response) => response.text());
		expect(index).toContain('account/welcome');
		expect(index).toContain('/preview/account/welcome');

		const response = await fetch(`${server.url}preview/account/welcome`);
		expect(response.status).toBe(200);
		expect(await response.text()).toContain('Hello preview');
	});

	it('serves static files and recompiles a changed template', async () => {
		const { emails } = await fixture();
		const template = join(emails, 'notice.tsrx');
		await writeFile(
			template,
			"import { Html, Text } from '@octanejs/react-email';\nexport default function Notice() @{ <Html><Text>{'First version'}</Text></Html> }\n",
		);
		await writeFile(join(emails, 'static', 'logo.txt'), 'logo');
		const server = await preview(emails);

		expect(await fetch(`${server.url}static/logo.txt`).then((response) => response.text())).toBe(
			'logo',
		);
		expect(
			await fetch(`${server.url}preview/notice`).then((response) => response.text()),
		).toContain('First version');

		await writeFile(
			template,
			"import { Html, Text } from '@octanejs/react-email';\nexport default function Notice() @{ <Html><Text>{'Second version'}</Text></Html> }\n",
		);
		await expect
			.poll(() => fetch(`${server.url}preview/notice`).then((response) => response.text()), {
				timeout: 2_000,
			})
			.toContain('Second version');
	});

	it('reports template errors and remains available', async () => {
		const { emails } = await fixture();
		await writeFile(join(emails, 'broken.tsrx'), 'export default function Broken() @{ <Html> }\n');
		const server = await preview(emails);

		const response = await fetch(`${server.url}preview/broken`);
		expect(response.status).toBe(500);
		expect(await response.text()).toMatch(/broken\.tsrx|Unexpected|error/i);
		expect((await fetch(server.url)).status).toBe(200);
	});
});
