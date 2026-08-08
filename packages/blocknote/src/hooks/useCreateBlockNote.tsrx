import {
  BlockNoteEditor,
  BlockNoteEditorOptions,
  CustomBlockNoteSchema,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
} from "@blocknote/core";
import { DependencyList, useMemo } from "octane";
import { withoutSlot } from "./without-slot";

/**
 * Hook to instantiate a BlockNote Editor instance in React
 */
export const useCreateBlockNote = <
  Options extends Partial<BlockNoteEditorOptions<any, any, any>> | undefined,
>(
  options: Options | symbol = {} as Options,
  deps: DependencyList | symbol = [],
  ...rest: [slot?: symbol]
): Options extends {
  schema: CustomBlockNoteSchema<infer BSchema, infer ISchema, infer SSchema>;
}
  ? BlockNoteEditor<BSchema, ISchema, SSchema>
  : BlockNoteEditor<
      DefaultBlockSchema,
      DefaultInlineContentSchema,
      DefaultStyleSchema
    > => {
  options = (withoutSlot(options) ?? {}) as Options;
  deps = withoutSlot(deps) ?? [];
  return useMemo(() => {
    const editor = BlockNoteEditor.create(options) as any;
    if (window) {
      // for testing / dev purposes
      (window as any).ProseMirror = editor._tiptapEditor;
    }
    return editor;
  }, deps); //eslint-disable-line react-hooks/exhaustive-deps
};
