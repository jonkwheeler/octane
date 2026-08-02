import type { ElementDescriptor } from 'octane';
import { processSync } from './processor';
import { projectTree } from './project';
import type { Options } from './types';

export function Markdown(options: Readonly<Options>): ElementDescriptor {
	return projectTree(processSync(options), options.components);
}

export { Markdown as default };
export { MarkdownAsync } from './markdown-async';
export { MarkdownHooks } from './markdown-hooks.tsrx';
export { defaultUrlTransform } from './url-transform';
export type {
	AllowElement,
	Components,
	ExtraProps,
	HooksOptions,
	Options,
	UrlTransform,
} from './types';
