import React from 'react';
import SyntaxHighlighter, {
	Light,
	Prism,
	PrismLight,
	createElement,
	type SyntaxHighlighterProps,
} from 'react-syntax-highlighter';
import javascript from 'react-syntax-highlighter/dist/esm/languages/hljs/javascript';
import github from 'react-syntax-highlighter/dist/esm/styles/hljs/github';

const props = {
	language: 'javascript',
	children: 'const answer = 42;',
	style: github,
	showLineNumbers: true,
	lineNumberStyle: (line: number) => ({ color: line > 1 ? 'red' : 'blue' }),
	lineProps: (line: number) => ({ id: `line-${line}` }),
	PreTag: (componentProps: React.HTMLProps<HTMLElement>) =>
		React.createElement('section', componentProps),
	CodeTag: 'samp',
	renderer: ({ rows, stylesheet, useInlineStyles }) =>
		rows.map((node, index) =>
			createElement({ node, stylesheet, useInlineStyles, key: `row-${index}` }),
		),
} satisfies SyntaxHighlighterProps;

React.createElement(SyntaxHighlighter, props);
Light.registerLanguage('javascript', javascript);
PrismLight.alias('js', ['javascript', 'jsx']);
PrismLight.alias({ js: 'javascript' });
SyntaxHighlighter.supportedLanguages.includes('javascript');
Prism.supportedLanguages.includes('javascript');

// @ts-expect-error -- children/code is the only required public prop.
const missingChildren: SyntaxHighlighterProps = { language: 'javascript' };
// @ts-expect-error -- the pinned declarations accept only string code.
const nonStringChildren: SyntaxHighlighterProps = { children: 42 };

void missingChildren;
void nonStringChildren;
