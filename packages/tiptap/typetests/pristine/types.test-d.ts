/**
 * Repo-authored pristine type evidence for @tiptap/react@3.28.0.
 * Upstream ships no dedicated compile-time suite; these assertion groups pair
 * with packages/tiptap/typetests/*.test-d.ts on the adapted side.
 */
import type { Editor } from '@tiptap/core';
import {
	BubbleMenu,
	FloatingMenu,
	type BubbleMenuProps,
	type FloatingMenuProps,
} from '@tiptap/react/menus';
import {
	EditorContent,
	useCurrentEditor,
	useEditor,
	useEditorState,
	type EditorContentProps,
	type UseEditorOptions,
} from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import type { CSSProperties, MouseEventHandler, ReactNode } from 'react';

const options: UseEditorOptions = {
	extensions: [StarterKit],
	content: '<p>Typed</p>',
};
const editor: Editor | null = useEditor(options);
const current = useCurrentEditor();
const _currentEditor: Editor | null = current.editor;

const text: string | null = useEditorState({
	editor,
	selector: ({ editor: selectedEditor }) => selectedEditor?.getText() ?? '',
});

const contentProps: EditorContentProps = {
	editor,
	children: null as ReactNode,
	style: { marginTop: 8 } satisfies CSSProperties,
};

const onClick: MouseEventHandler<HTMLDivElement> = (event) => {
	void event.nativeEvent;
};
const bubbleProps: BubbleMenuProps = {
	children: 'bubble',
	className: 'menu',
	onClick,
};
const floatingProps = {
	editor: null as Editor | null,
	children: 'floating',
} satisfies FloatingMenuProps;

void editor;
void _currentEditor;
void text;
void EditorContent;
void contentProps;
void BubbleMenu;
void FloatingMenu;
void bubbleProps;
void floatingProps;

// @ts-expect-error unknown editor option is rejected
const badOptions: UseEditorOptions = { notAnEditorOption: true };
void badOptions;
