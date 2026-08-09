// Adapted side: @octanejs/tiptap, compiled with tsc. Assertion groups are
// listed in ../assertions.md and must stay one-for-one with
// ../pristine/types.test-d.ts.
import type { Editor } from '@tiptap/core';
import {
	BubbleMenu,
	FloatingMenu,
	type BubbleMenuProps,
	type FloatingMenuProps,
} from '@octanejs/tiptap/menus';
import {
	EditorContent,
	useCurrentEditor,
	useEditor,
	useEditorState,
	type EditorContentProps,
	type UseEditorOptions,
} from '@octanejs/tiptap';
import StarterKit from '@tiptap/starter-kit';
import type { OctaneNode } from 'octane';

// 1. UseEditorOptions accepts starter options.
const options: UseEditorOptions = {
	extensions: [StarterKit],
	content: '<p>Typed</p>',
};

// 2. useEditor returns a value assignable to Editor | null.
const editor: Editor | null = useEditor(options);

// 3. useCurrentEditor().editor is Editor | null.
const current = useCurrentEditor();
const currentEditor: Editor | null = current.editor;

// 4. useEditorState selector result is string | null.
const text: string | null = useEditorState({
	editor,
	selector: function selectText({ editor: selectedEditor }) {
		return selectedEditor?.getText() ?? '';
	},
});

// 5. EditorContent accepts props and is callable with those props.
const contentProps: EditorContentProps = {
	editor,
	children: null as OctaneNode,
	style: { marginTop: 8 },
};
EditorContent(contentProps);

// 6. BubbleMenu / FloatingMenu accept props and are callable with those props.
const bubbleProps: BubbleMenuProps = {
	children: 'bubble',
	class: 'menu',
};
const floatingProps = {
	editor: null as Editor | null,
	children: 'floating',
} satisfies FloatingMenuProps;
BubbleMenu(bubbleProps);
FloatingMenu(floatingProps);

void currentEditor;
void text;

// 7. Unknown UseEditorOptions keys are rejected.
// @ts-expect-error unknown editor option is rejected
const badOptions: UseEditorOptions = { notAnEditorOption: true };
void badOptions;
