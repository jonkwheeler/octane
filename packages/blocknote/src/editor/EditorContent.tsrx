// CHECKPOINT: manual review required — TipTap/react-dom integration boundary
import { ReactRenderer } from "@octanejs/tiptap";
import { createPortal, OctaneNode, useSyncExternalStore } from "octane";

// this file takes the methods we need from
// https://github.com/ueberdosis/tiptap/blob/develop/packages/react/src/EditorContent.tsx

type RendererPortalEntry = {
  id: string;
  portal: OctaneNode;
};

type RendererPortalSnapshot = Record<string, RendererPortalEntry>;

export function getContentComponent() {
  const subscribers = new Set<() => void>();
  let renderers: RendererPortalSnapshot = {};

  return {
    /**
     * Subscribe to the editor instance's changes.
     */
    subscribe(callback: () => void) {
      subscribers.add(callback);
      return () => {
        subscribers.delete(callback);
      };
    },
    getSnapshot() {
      return renderers;
    },
    getServerSnapshot() {
      return renderers;
    },
    /**
     * Adds a new NodeView Renderer to the editor.
     */
    setRenderer(id: string, renderer: ReactRenderer) {
      renderers = {
        ...renderers,
        [id]: {
          id,
          portal: createPortal(renderer.reactElement, renderer.element),
        },
      };

      subscribers.forEach((subscriber) => subscriber());
    },
    /**
     * Removes a NodeView Renderer from the editor.
     */
    removeRenderer(id: string) {
      const nextRenderers = { ...renderers };

      delete nextRenderers[id];
      renderers = nextRenderers;
      subscribers.forEach((subscriber) => subscriber());
    },
  };
}

type ContentComponent = ReturnType<typeof getContentComponent>;

function PortalEntry({ entry }: { entry: RendererPortalEntry }) {
  return entry.portal;
}

/**
 * This component renders all of the editor's node views.
 */
export function Portals({
  contentComponent,
}: {
  contentComponent: ContentComponent;
}) @{
  // For performance reasons, we render the node view portals on state changes only
  const renderers = useSyncExternalStore(
    // eslint-disable-next-line @typescript-eslint/unbound-method -- contentComponent is a plain object, not a class
    contentComponent.subscribe,
    // eslint-disable-next-line @typescript-eslint/unbound-method -- contentComponent is a plain object, not a class
    contentComponent.getSnapshot,
    // eslint-disable-next-line @typescript-eslint/unbound-method -- contentComponent is a plain object, not a class
    contentComponent.getServerSnapshot,
  );
  const entries = Object.values(renderers);

  <>
    @for (const entry of entries; key entry.id) {
      <PortalEntry entry={entry} />
    }
  </>
}
