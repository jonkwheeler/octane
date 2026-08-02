import type { Element, Parents } from 'hast';
import type { Options as RemarkRehypeOptions } from 'remark-rehype';
import type { PluggableList } from 'unified';

export type AllowElement = (
	element: Readonly<Element>,
	index: number,
	parent: Readonly<Parents> | undefined,
) => boolean | null | undefined;

export interface ExtraProps {
	node?: Element | undefined;
}

export type UrlTransform = (
	url: string,
	key: string,
	node: Readonly<Element>,
) => string | null | undefined;

export interface Options {
	allowElement?: AllowElement | null | undefined;
	allowedElements?: ReadonlyArray<string> | null | undefined;
	children?: string | null | undefined;
	components?: unknown;
	disallowedElements?: ReadonlyArray<string> | null | undefined;
	rehypePlugins?: PluggableList | null | undefined;
	remarkPlugins?: PluggableList | null | undefined;
	remarkRehypeOptions?: Readonly<RemarkRehypeOptions> | null | undefined;
	skipHtml?: boolean | null | undefined;
	unwrapDisallowed?: boolean | null | undefined;
	urlTransform?: UrlTransform | null | undefined;
}
