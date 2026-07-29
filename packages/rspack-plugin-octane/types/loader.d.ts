import type { OctaneRspackLoaderOptions } from './index.js';

/**
 * A webpack-loader-compatible transform. The structural declaration keeps
 * loader-only consumers from needing Rspack's types.
 */
declare function octaneLoader(
	this: {
		getOptions?: () => OctaneRspackLoaderOptions;
		callback: (error: Error | null, content?: string | Uint8Array, map?: unknown) => void;
	},
	source: string | Uint8Array,
	inputSourceMap?: unknown,
): void;
export default octaneLoader;
