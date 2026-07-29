import { MantineProvider } from '@octanejs/mantine-core';
import { CodeHighlight, InlineCodeHighlight } from '@octanejs/mantine-code-highlight';

export function CodeHighlightApp() @{
	<MantineProvider>
		<CodeHighlight code="const answer = 42;" language="ts" withCopyButton={false} />
		<InlineCodeHighlight code="npm install octane" />
	</MantineProvider>
}
