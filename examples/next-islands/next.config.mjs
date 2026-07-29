import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const fixtureRoot = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(fixtureRoot, '../..');
const octaneRuntime = resolve(workspaceRoot, 'packages/octane/dist/index.js');
const octaneReactRuntime = resolve(workspaceRoot, 'packages/octane/dist/react/index.js');
const octaneBindingSource = /node_modules[\\/]\.pnpm[\\/]@octanejs\+(?:recharts|redux|tiptap)@/;
const octaneLoader = (requireDirective) => ({
	loader: '@octanejs/rspack-plugin/loader',
	options: {
		environment: 'client',
		requireDirective,
	},
});

/** @type {import('next').NextConfig} */
const config = {
	transpilePackages: ['@octanejs/recharts', '@octanejs/redux', '@octanejs/tiptap'],
	typescript: {
		// Next invokes stock TypeScript, which cannot parse TSRX. The build
		// script runs tsrx-tsc first and only skips Next's duplicate pass.
		ignoreBuildErrors: true,
	},
	turbopack: {
		root: workspaceRoot,
		resolveAlias: {
			octane: '../../packages/octane/dist/index.js',
			'octane/react': '../../packages/octane/dist/react/index.js',
		},
		rules: {
			'*.tsx': {
				condition: {
					not: {
						path: /\.tsrx\.tsx$/,
					},
				},
				loaders: [octaneLoader(true)],
			},
			'*.ts': {
				condition: {
					path: octaneBindingSource,
				},
				loaders: [octaneLoader(false)],
			},
			'*.tsrx': [
				{
					condition: {
						path: octaneBindingSource,
					},
					loaders: [octaneLoader(false)],
					as: '*.tsx',
				},
				{
					condition: {
						not: {
							path: octaneBindingSource,
						},
					},
					loaders: [octaneLoader(true)],
					as: '*.tsx',
				},
			],
		},
		resolveExtensions: ['.tsrx', '.tsx', '.ts', '.jsx', '.js', '.mjs', '.json'],
	},
	webpack(config) {
		config.resolve.extensions.push('.tsrx');
		config.resolve.alias['octane$'] = octaneRuntime;
		config.resolve.alias['octane/react$'] = octaneReactRuntime;
		config.module.rules.push({
			test: /(?<!\.d)\.(?:ts|tsrx)$/,
			include(resourcePath) {
				return octaneBindingSource.test(resourcePath);
			},
			enforce: 'pre',
			use: octaneLoader(false),
		});
		config.module.rules.push({
			test: /\.tsx$/,
			enforce: 'pre',
			use: octaneLoader(true),
		});
		config.module.rules.push({
			test: /\.tsrx$/,
			exclude: octaneBindingSource,
			enforce: 'pre',
			use: octaneLoader(true),
		});
		return config;
	},
};

export default config;
