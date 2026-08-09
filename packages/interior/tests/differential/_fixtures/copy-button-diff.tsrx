import { CopyButton } from '@octanejs/interior';

export function CopyButtonDiff() {
	return <div id="root">
		<CopyButton value="hello" label="Copy" copiedLabel="Copied" errorLabel="Failed" />
	</div>;
}
