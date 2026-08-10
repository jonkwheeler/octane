// Adapted side: @octanejs/tiptap, compiled with tsrx-tsc. Assertion groups are
// inventoried by scripts/react-parity/tiptap-types-lib.mjs and must stay
// one-for-one with ../pristine/types.test-d.ts.
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

type Expect<T extends true> = T;
type Equal<X, Y> =
	(<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? true : false;
type IsAny<T> = 0 extends 1 & T ? true : false;
type NotAny<T> = IsAny<T> extends true ? false : true;
type CallResult<F> = F extends (...args: any) => infer R ? R : never;

// 1. UseEditorOptions accepts starter options.
const options: UseEditorOptions = {
	extensions: [StarterKit],
	content: '<p>Typed</p>',
};

// 2. useEditor returns Editor (exact; not erased any).
const editor = useEditor(options);
type _useEditorExact = Expect<Equal<typeof editor, Editor>>;
type _useEditorNotAny = Expect<NotAny<typeof editor>>;

// 3. useCurrentEditor().editor is Editor | null (exact; not erased any).
const current = useCurrentEditor();
type _currentEditorExact = Expect<Equal<typeof current.editor, Editor | null>>;
type _currentEditorNotAny = Expect<NotAny<typeof current.editor>>;

// 4. useEditorState selector result is string (exact; not erased any).
const text = useEditorState({
	editor,
	selector: function selectText({ editor: selectedEditor }) {
		return selectedEditor?.getText() ?? '';
	},
});
type _useEditorStateExact = Expect<Equal<typeof text, string>>;
type _useEditorStateNotAny = Expect<NotAny<typeof text>>;

// 5. EditorContent accepts props and has a non-any callable signature/result.
const contentProps: EditorContentProps = {
	editor,
	children: null as OctaneNode,
	style: { marginTop: 8 },
};
type _editorContentNotAny = Expect<NotAny<typeof EditorContent>>;
type _editorContentResultNotAny = Expect<NotAny<CallResult<typeof EditorContent>>>;
void contentProps;

// 6. BubbleMenu / FloatingMenu accept props and have non-any callable signatures/results.
const bubbleProps: BubbleMenuProps = {
	children: 'bubble',
	className: 'menu',
};
const floatingProps = {
	editor: null as Editor | null,
	children: 'floating',
} satisfies FloatingMenuProps;
type _bubbleMenuNotAny = Expect<NotAny<typeof BubbleMenu>>;
type _floatingMenuNotAny = Expect<NotAny<typeof FloatingMenu>>;
type _bubbleResultNotAny = Expect<NotAny<CallResult<typeof BubbleMenu>>>;
type _floatingResultNotAny = Expect<NotAny<CallResult<typeof FloatingMenu>>>;
void bubbleProps;
void floatingProps;

// 7. Unknown UseEditorOptions keys are rejected.
// @ts-expect-error unknown editor option is rejected
const badOptions: UseEditorOptions = { notAnEditorOption: true };
void badOptions;
