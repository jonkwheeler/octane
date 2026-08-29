process.env.NODE_ENV = 'production';

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

import { summarizeSamples, timingStatForJson } from '../lib/stats.mjs';
import { octane } from '../../packages/octane/src/compiler/vite.js';

if (process.env.OCTANE_HYDRATION_RANGE_STACK !== '1') {
	const { spawnSync } = await import('node:child_process');
	const child = spawnSync(
		process.execPath,
		['--stack-size=16384', import.meta.filename, ...process.argv.slice(2)],
		{
			env: { ...process.env, OCTANE_HYDRATION_RANGE_STACK: '1' },
			stdio: 'inherit',
		},
	);
	process.exit(child.status ?? 1);
}

const HERE = import.meta.dirname;
const REPO = path.resolve(HERE, '../..');
const benchmarkRequire = createRequire(path.join(REPO, 'benchmarks/news/package.json'));
const rawIterations = process.argv[2] ?? '9';
const iterations = Number(rawIterations);
const DEPTHS = [64, 512];

if (!Number.isSafeInteger(iterations) || iterations < 1) {
	throw new TypeError(`iterations must be a positive safe integer, received ${rawIterations}.`);
}

async function buildEntry(entry, output, ssr) {
	const { build } = await import(pathToFileURL(benchmarkRequire.resolve('vite')).href);
	const octaneSource = path.join(REPO, 'packages/octane/src');
	await build({
		root: REPO,
		configFile: false,
		logLevel: 'warn',
		resolve: {
			alias: [
				{ find: /^octane\/server$/, replacement: path.join(octaneSource, 'server/index.ts') },
				{ find: /^octane$/, replacement: path.join(octaneSource, 'index.ts') },
			],
		},
		plugins: [octane({ ssr })],
		define: { 'process.env.NODE_ENV': JSON.stringify('production') },
		build: {
			lib: { entry, formats: ['es'], fileName: () => path.basename(output) },
			outDir: path.dirname(output),
			emptyOutDir: true,
			minify: true,
			target: 'node22',
		},
	});
}

async function setupDom() {
	const { JSDOM } = await import('jsdom');
	const dom = new JSDOM('<!doctype html><html><body></body></html>', {
		pretendToBeVisual: true,
		url: 'http://localhost/',
	});
	for (const key of [
		'window',
		'document',
		'navigator',
		'EventTarget',
		'Event',
		'MouseEvent',
		'Node',
		'NodeFilter',
		'Element',
		'HTMLElement',
		'HTMLButtonElement',
		'Text',
		'Comment',
		'DocumentFragment',
		'MutationObserver',
	]) {
		const value = key === 'window' ? dom.window : dom.window[key];
		if (value === undefined) continue;
		Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
	}
	return dom;
}

function hydrationMarkers(container) {
	const iterator = document.createNodeIterator(container, NodeFilter.SHOW_COMMENT);
	let opens = 0;
	let closes = 0;
	let logicalDepth = 0;
	for (let node = iterator.nextNode(); node !== null; node = iterator.nextNode()) {
		const open = /^\[(\d*)$/.exec(node.data);
		if (open !== null) {
			opens++;
			logicalDepth += open[1] === '' ? 1 : Number(open[1]);
			continue;
		}
		const close = /^\](\d*)$/.exec(node.data);
		if (close !== null) closes++;
	}
	return { opens, closes, logicalDepth };
}

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'octane-hydration-range-'));
const clientFile = path.join(tempDir, 'client', 'entry.js');
const serverFile = path.join(tempDir, 'server', 'entry.js');
let failure;
const targets = [];

try {
	await buildEntry(path.join(HERE, 'src/client.ts'), clientFile, false);
	await buildEntry(path.join(HERE, 'src/server.ts'), serverFile, true);
	const server = await import(pathToFileURL(serverFile).href);
	const serverHtml = new Map(DEPTHS.map((depth) => [depth, server.renderCase(depth)]));
	const dom = await setupDom();
	const client = await import(pathToFileURL(clientFile).href);
	const samples = new Map(DEPTHS.map((depth) => [depth, []]));
	const controls = new Map();

	const runCase = (depth) => {
		const container = document.createElement('main');
		document.body.appendChild(container);
		container.innerHTML = serverHtml.get(depth);
		const before = hydrationMarkers(container);
		const result = client.hydrateCase(container, depth);
		const after = hydrationMarkers(container);
		if (before.opens !== before.closes || after.opens !== after.closes) {
			throw new Error(`${depth}-wrapper hydration left unbalanced marker pairs.`);
		}
		if (before.logicalDepth !== after.logicalDepth || after.opens >= before.opens) {
			throw new Error(
				`${depth}-wrapper hydration did not preserve and compact its logical ranges: ` +
					JSON.stringify({ before, after }),
			);
		}
		result.root.unmount();
		if (container.childNodes.length !== 0 || result.leaf.isConnected) {
			throw new Error(`${depth}-wrapper unmount left hydrated content connected.`);
		}
		container.remove();
		controls.set(depth, { before, after });
		return result.durationMs;
	};

	for (const depth of DEPTHS) runCase(depth);
	for (let iteration = 0; iteration < iterations; iteration++) {
		const order = iteration % 2 === 0 ? DEPTHS : [...DEPTHS].reverse();
		for (const depth of order) samples.get(depth).push(runCase(depth));
	}

	for (const depth of DEPTHS) {
		const raw = samples.get(depth);
		const control = controls.get(depth);
		targets.push({
			name: `wrappers-${depth}`,
			ops: {
				hydrate: timingStatForJson(summarizeSamples(raw)),
				hydrate_per_100_wrappers: timingStatForJson(
					summarizeSamples(raw.map((elapsed) => (elapsed * 100) / depth)),
				),
			},
			meta: {
				correctness: 'pass',
				logicalRanges: control.after.logicalDepth,
				physicalPairsBefore: control.before.opens,
				physicalPairsAfter: control.after.opens,
				serverLeafAdopted: true,
				interactionHandled: true,
				unmountClean: true,
				wrappers: depth,
			},
		});
	}

	for (const target of targets) {
		console.log(
			`PASS hydration-range-compaction/${target.name}: ` +
				`${target.ops.hydrate.score.toFixed(3)}ms ` +
				`(${target.ops.hydrate_per_100_wrappers.score.toFixed(3)}ms/100 wrappers)`,
		);
	}
	dom.window.close();
} catch (error) {
	failure = error instanceof Error ? (error.stack ?? error.message) : String(error);
	console.error(`FAIL hydration-range-compaction/${failure}`);
} finally {
	fs.rmSync(tempDir, { recursive: true, force: true });
}

const payload = {
	suite: 'hydration-range-compaction',
	iterations,
	targets,
	...(failure ? { failed: failure } : {}),
};

if (process.env.BENCH_JSON) {
	fs.writeFileSync(process.env.BENCH_JSON, `${JSON.stringify(payload, null, '\t')}\n`);
}
if (failure) process.exitCode = 1;
