import Markdown, {
	MarkdownAsync,
	MarkdownHooks,
	defaultUrlTransform,
	type Components,
	type Options,
} from 'react-markdown';

const components = {
	h1: ({ children, node: _node, ...props }) => <h2 {...props}>{children}</h2>,
	p: 'section',
} satisfies Components;
const options = { children: '# typed', components } satisfies Options;
const sync = <Markdown {...options} />;
const asyncResult: Promise<React.ReactElement> = MarkdownAsync(options);
const hooks = <MarkdownHooks {...options} fallback={<span>loading</span>} />;
const safe: string = defaultUrlTransform('https://example.com');
void sync;
void asyncResult;
void hooks;
void safe;

// @ts-expect-error children must be a string.
<Markdown children={123} />;
// @ts-expect-error intrinsic remaps must name a valid intrinsic.
const invalid: Components = { h1: 'not-an-element' };
void invalid;
