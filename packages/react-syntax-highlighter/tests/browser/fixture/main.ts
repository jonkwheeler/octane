import { createRoot, flushSync } from 'octane';
import SyntaxHighlighter, { LightAsync } from '../../../src/index.js';

const syncContainer = document.querySelector('#sync')!;
const asyncContainer = document.querySelector('#async')!;
const syncRoot = createRoot(syncContainer);
const asyncRoot = createRoot(asyncContainer);

const initialProps = {
	language: 'javascript',
	children: 'const answer = 42;\nanswer += 1;',
	PreTag: 'section',
	CodeTag: 'samp',
	showLineNumbers: true,
	showInlineLineNumbers: true,
	wrapLines: true,
	wrapLongLines: true,
	useInlineStyles: false,
	lineProps: (line: number) => ({ 'data-line': String(line) }),
	customStyle: { width: '160px', overflowX: 'auto' },
	'data-testid': 'sync-highlighter',
};

flushSync(() => syncRoot.render(SyntaxHighlighter, initialProps));
flushSync(() =>
	asyncRoot.render(LightAsync, {
		language: 'javascript',
		children: 'const asyncValue = true;',
		'data-testid': 'async-highlighter',
	}),
);

function selectKeyword(): string {
	const token = syncContainer.querySelector('.hljs-keyword');
	if (!token) throw new Error('missing keyword token');
	const range = document.createRange();
	range.selectNodeContents(token);
	const selection = getSelection();
	selection?.removeAllRanges();
	selection?.addRange(range);
	return selection?.toString() ?? '';
}

function snapshot() {
	const host = syncContainer.querySelector('[data-testid="sync-highlighter"]')!;
	const code = host.querySelector('samp')!;
	const lines = [...code.querySelectorAll('[data-line]')];
	const lineNumber = code.querySelector('.react-syntax-highlighter-line-number')!;
	return {
		hostTag: host.tagName,
		codeTag: code.tagName,
		text: code.textContent,
		whiteSpace: getComputedStyle(code).whiteSpace,
		lineDisplays: lines.map((line) => getComputedStyle(line).display),
		lineNumberMinWidth: getComputedStyle(lineNumber).minWidth,
		selected: selectKeyword(),
	};
}

window.__syntaxHighlighterBrowser = {
	snapshot,
	update() {
		flushSync(() =>
			syncRoot.render(SyntaxHighlighter, {
				...initialProps,
				language: 'json',
				children: '{"answer":43}',
			}),
		);
		return {
			text: syncContainer.querySelector('samp')?.textContent,
			attribute: syncContainer.querySelector('.hljs-attr')?.textContent,
		};
	},
	async asyncSnapshot() {
		await LightAsync.preload();
		for (let attempt = 0; attempt < 50; attempt++) {
			const keyword = asyncContainer.querySelector('.hljs-keyword');
			if (keyword) {
				return {
					keyword: keyword.textContent,
					text: asyncContainer.querySelector('code')?.textContent,
				};
			}
			await new Promise((resolve) => requestAnimationFrame(resolve));
		}
		throw new Error('async language did not settle');
	},
	unmount() {
		syncRoot.unmount();
		asyncRoot.unmount();
	},
};

declare global {
	interface Window {
		__syntaxHighlighterBrowser: {
			snapshot(): unknown;
			update(): unknown;
			asyncSnapshot(): Promise<unknown>;
			unmount(): void;
		};
	}
}
