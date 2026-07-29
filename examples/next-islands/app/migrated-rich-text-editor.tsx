/** @jsxImportSource octane */
import { useEditor, EditorContent } from '@octanejs/tiptap';
import StarterKit from '@tiptap/starter-kit';

const extensions = [StarterKit];

export function MigratedRichTextEditor() {
	const editor = useEditor({
		extensions,
		content: '<p>Hello from the React application</p>',
	});

	return (
		<section className="island" role="region" aria-label="Migrated rich text editor">
			<h2>Migrated Tiptap leaf</h2>
			<button
				type="button"
				onClick={() => editor?.commands.setContent('<p>Edited by the Octane Tiptap binding</p>')}
			>
				Replace content
			</button>
			<EditorContent editor={editor} />
		</section>
	);
}
