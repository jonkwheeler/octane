import { createElement as createOctaneElement } from 'octane';
import SyntaxHighlighter, {
	Light,
	LightAsync,
	Prism,
	PrismLight,
	createElement,
	type SyntaxHighlighterProps,
} from '@octanejs/react-syntax-highlighter';
import javascript from '@octanejs/react-syntax-highlighter/dist/esm/languages/hljs/javascript';
import github from '@octanejs/react-syntax-highlighter/dist/esm/styles/hljs/github';

const props = {
	language: 'javascript',
	children: 'const answer = 42;',
	style: github,
	showLineNumbers: true,
	lineNumberStyle: (line: number) => ({ color: line > 1 ? 'red' : 'blue' }),
	lineProps: (line: number) => ({ id: `line-${line}` }),
	PreTag: (componentProps: Record<string, unknown>) =>
		createOctaneElement('section', componentProps),
	CodeTag: 'samp',
	renderer: ({ rows, stylesheet, useInlineStyles }) =>
		rows.map((node, index) =>
			createElement({ node, stylesheet, useInlineStyles, key: `row-${index}` }),
		),
} satisfies SyntaxHighlighterProps;

createOctaneElement(SyntaxHighlighter, props);
Light.registerLanguage('javascript', javascript);
PrismLight.alias('js', ['javascript', 'jsx']);
PrismLight.alias({ js: 'javascript' });
SyntaxHighlighter.supportedLanguages.includes('javascript');
Prism.supportedLanguages.includes('javascript');
await LightAsync.preload();
await LightAsync.loadLanguage('javascript');
LightAsync.isSupportedLanguage('javascript');
LightAsync.isRegistered('javascript');

// @ts-expect-error -- children/code is the only required public prop.
const missingChildren: SyntaxHighlighterProps = { language: 'javascript' };
// @ts-expect-error -- the pinned declarations accept only string code.
const nonStringChildren: SyntaxHighlighterProps = { children: 42 };

void missingChildren;
void nonStringChildren;
