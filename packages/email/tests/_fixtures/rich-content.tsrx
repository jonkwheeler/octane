import { CodeBlock, Markdown, vscDarkPlus } from '../../src/index.ts';

export function MarkdownEmail() @{
	<Markdown
		markdownCustomStyles={{ p: { color: '#123456' } }}
		children={
			'# Hello\n\nThis is **important** and [linked](https://octanejs.dev).\n\n- First\n- Second'
		}
	/>
}

export function CodeBlockEmail() @{
	<CodeBlock
		code="const answer = 42;
console.log(answer);"
		language="javascript"
		lineNumbers
		theme={vscDarkPlus}
	/>
}

export function InvalidCodeBlockEmail() @{
	<CodeBlock code="hello" language={'not-a-language' as never} theme={vscDarkPlus} />
}
