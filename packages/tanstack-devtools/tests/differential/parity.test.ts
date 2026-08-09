import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act as reactAct } from 'react';
import { drainPassiveEffects, flushSync as octaneFlushSync } from 'octane';
import { describe, expect, it, vi } from 'vitest';
import { mountDifferential } from '../../../octane/tests/differential/_rig.js';

const root = resolve(__dirname, '../../../..');
const crosswalk = JSON.parse(
	readFileSync(resolve(root, 'packages/tanstack-devtools/audit/upstream-crosswalk.json'), 'utf8'),
);
const octaneIndex = readFileSync(resolve(root, 'packages/tanstack-devtools/src/index.ts'), 'utf8');

interface FakeCore {
	plugins: any[];
	config: any;
	mount: ReturnType<typeof vi.fn>;
	unmount: ReturnType<typeof vi.fn>;
	setConfig: ReturnType<typeof vi.fn>;
}
const { instances } = vi.hoisted(() => ({ instances: [] as FakeCore[] }));

vi.mock('@tanstack/devtools', () => {
	class TanStackDevtoolsCore {
		plugins: any[];
		config: any;
		mount = vi.fn();
		unmount = vi.fn();
		setConfig = vi.fn((next: any) => {
			if (next.plugins) this.plugins = next.plugins;
		});
		constructor(init: any) {
			this.plugins = init.plugins;
			this.config = init.config;
			instances.push(this as unknown as FakeCore);
		}
	}
	return {
		TanStackDevtoolsCore,
		PLUGIN_CONTAINER_ID: 'plugin',
		PLUGIN_TITLE_CONTAINER_ID: 'title',
	};
});

const fixture = resolve(__dirname, '../_fixtures/devtools-diff.tsrx');
const cache = resolve(__dirname, '.react-cache');

function coreFor(container: HTMLElement): FakeCore {
	const core = instances.find((entry) => container.contains(entry.mount.mock.calls[0]?.[0]));
	if (!core) throw new Error('missing core for differential container');
	return core;
}

describe('differential: @octanejs/tanstack-devtools vs @tanstack/react-devtools', () => {
	// @parity-case differential:tanstack-devtools-portal-lifecycle
	it('matches mount, plugin, title, trigger, config, and teardown behavior', async () => {
		instances.length = 0;
		const differential = await mountDifferential(fixture, 'DevtoolsParity', undefined, cache);
		await differential.step('mount', () => {});
		const octaneCore = coreFor(differential.octane.container);
		const reactCore = coreFor(differential.react.container);
		expect(octaneCore.setConfig).toHaveBeenCalledTimes(1);
		expect(reactCore.setConfig).toHaveBeenCalledTimes(1);

		const makeTargets = (container: HTMLElement) => {
			const panel = document.createElement('div');
			panel.id = 'parity-plugin';
			container.appendChild(panel);
			const title = document.createElement('div');
			title.id = 'parity-title';
			container.appendChild(title);
			const trigger = document.createElement('div');
			container.appendChild(trigger);
			return { panel, title, trigger };
		};
		const octaneTargets = makeTargets(differential.octane.container);
		const reactTargets = makeTargets(differential.react.container);
		octaneFlushSync(() => {
			octaneCore.plugins[0].render(octaneTargets.panel, { theme: 'dark', devtoolsOpen: true });
			octaneCore.plugins[0].name(octaneTargets.title, { theme: 'dark', devtoolsOpen: true });
			octaneCore.config.customTrigger(octaneTargets.trigger, { theme: 'dark' });
		});
		await reactAct(async () => {
			reactCore.plugins[0].render(reactTargets.panel, { theme: 'dark', devtoolsOpen: true });
			reactCore.plugins[0].name(reactTargets.title, { theme: 'dark', devtoolsOpen: true });
			reactCore.config.customTrigger(reactTargets.trigger, { theme: 'dark' });
		});
		await differential.step('core callbacks portal equivalent content', () => {});
		expect(octaneTargets.panel.textContent).toBe('theme:dark');
		expect(octaneTargets.title.textContent).toBe('Plugin title');
		expect(octaneTargets.trigger.textContent).toBe('Open tools');
		differential.unmount();
		drainPassiveEffects();
		expect(octaneCore.unmount).toHaveBeenCalledTimes(1);
		expect(reactCore.unmount).toHaveBeenCalledTimes(1);
	});

	// OCTANE DIVERGENCE[core-version][differential:tanstack-devtools-core-version]
	// @parity-case differential:tanstack-devtools-core-version
	it('records the framework-neutral core version drift', () => {
		expect(crosswalk.coreDependency).toEqual({
			upstreamVersion: '0.12.4',
			octaneVersion: '0.12.5',
			disposition: 'version-divergence',
		});
	});

	// OCTANE DIVERGENCE[octane-type-names][differential:tanstack-devtools-type-names]
	// @parity-case differential:tanstack-devtools-type-names
	it('records the Octane-prefixed public adapter type names', () => {
		expect(octaneIndex).toContain('TanStackDevtoolsOctanePlugin');
		expect(octaneIndex).toContain('TanStackDevtoolsOctaneInit');
		expect(crosswalk.exports).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					name: 'TanStackDevtoolsReactPlugin',
					octaneExport: 'TanStackDevtoolsOctanePlugin',
					disposition: 'renamed-divergence',
				}),
				expect.objectContaining({
					name: 'TanStackDevtoolsReactInit',
					octaneExport: 'TanStackDevtoolsOctaneInit',
					disposition: 'renamed-divergence',
				}),
			]),
		);
	});

	// OCTANE DIVERGENCE[extra-core-reexports][differential:tanstack-devtools-core-reexports]
	// @parity-case differential:tanstack-devtools-core-reexports
	it('records the additional framework-neutral core re-exports', () => {
		expect(octaneIndex).toContain('TanStackDevtoolsCore');
		expect(octaneIndex).toContain('PLUGIN_CONTAINER_ID');
		expect(crosswalk.octaneAdditiveExports).toEqual(
			expect.objectContaining({
				disposition: 'additive-divergence',
				divergenceId: 'extra-core-reexports',
			}),
		);
	});
});
