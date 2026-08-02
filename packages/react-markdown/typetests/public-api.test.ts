import type { ComponentBody, ElementDescriptor } from 'octane';
import type { Octane } from 'octane/jsx-runtime';
import Markdown, {
	defaultUrlTransform,
	type AllowElement,
	type Components,
	type ExtraProps,
	type HooksOptions,
	type Options,
	type UrlTransform,
} from '../src/index';

const Heading: ComponentBody<Octane.JSX.IntrinsicElements['h1'] & ExtraProps> = () => {};
const components = { h1: Heading, p: 'section' } satisfies Components;
const allow: AllowElement = (element, index, parent) =>
	element.tagName === 'p' && index >= 0 && parent?.type === 'root';
const transform: UrlTransform = (url, key, node) =>
	key === 'href' && node.tagName === 'a' ? url : undefined;
const options = {
	children: '# typed',
	components,
	allowElement: allow,
	urlTransform: transform,
	remarkPlugins: [],
	rehypePlugins: [],
} satisfies Options;
const rendered: ElementDescriptor = Markdown(options);
const hooks: HooksOptions = { ...options, fallback: rendered };
const safe: string = defaultUrlTransform('https://example.com');
void hooks;
void safe;

// @ts-expect-error children must be a string.
Markdown({ children: 123 });
// @ts-expect-error intrinsic remaps must name a real intrinsic element.
const badComponents: Components = { h1: 'not-an-element' };
// @ts-expect-error component props must match the mapped intrinsic element.
const badHeading: Components = { h1: (props: { missing: true }) => {} };
void badComponents;
void badHeading;
