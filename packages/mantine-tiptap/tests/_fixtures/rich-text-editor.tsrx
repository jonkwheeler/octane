import StarterKit from '@tiptap/starter-kit';
import { MantineProvider } from '@octanejs/mantine-core';
import { RichTextEditor } from '@octanejs/mantine-tiptap';
import { useEditor } from '@octanejs/tiptap';

const extensions = [StarterKit];

export function RichTextEditorApp() @{
	const editor = useEditor({
		extensions,
		content: '<p>Hello Mantine editor</p>',
		immediatelyRender: true,
	});

	<MantineProvider>
		<RichTextEditor editor={editor}>
			<RichTextEditor.Toolbar>
				<RichTextEditor.ControlsGroup>
					<RichTextEditor.Bold />
				</RichTextEditor.ControlsGroup>
			</RichTextEditor.Toolbar>
			<RichTextEditor.Content />
		</RichTextEditor>
	</MantineProvider>
}
