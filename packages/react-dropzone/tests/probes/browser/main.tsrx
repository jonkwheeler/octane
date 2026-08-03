import { createRoot } from 'octane';
import { HookProbe } from '../dropzone.tsrx';

const root = createRoot(document.querySelector('#app')!);
root.render(HookProbe, {
	options: {
		onDrop(files: File[]) {
			document.body.dataset.lastDrop = files.map((file) => file.name).join(',');
		},
	},
	rootRef: null,
	inputRef: null,
});
