/**
 * Adapted divergence: ReactMarkView tears down its portal when ProseMirror
 * destroys the mark view, closing a renderer leak present in @tiptap/react 3.28.0.
 */
import type { Editor } from '@tiptap/core';
import { flushSync } from 'octane';
import { describe, expect, it } from 'vitest';

import { CustomViewsEditor } from '../_fixtures/custom-views.tsrx';
import { flushEffects, mount, nextPaint } from '../_helpers';

function settle(): void {
	flushEffects();
	flushSync(function () {});
	flushEffects();
}

async function settlePortals(): Promise<void> {
	await Promise.resolve();
	settle();
	await Promise.resolve();
	settle();
}

function findMarkedRange(editor: Editor): { from: number; to: number } {
	let range: { from: number; to: number } | undefined;

	editor.state.doc.descendants(function walk(node, position) {
		if (
			node.isText &&
			node.marks.some(function hasBadge(mark) {
				return mark.type.name === 'badgeMark';
			})
		) {
			range = { from: position, to: position + node.nodeSize };
		}
	});

	if (!range) {
		throw new Error('Expected the fixture to contain badge-marked text.');
	}

	return range;
}

describe('@octanejs/tiptap ReactMarkView portal cleanup', function () {
	// Extra conformance; required divergence marker is on src/ReactMarkViewRenderer.ts.
	it('tears down the mark-view portal when ProseMirror destroys the mark', async function () {
		let editor: Editor | undefined;
		const markLifecycle: string[] = [];
		const markRefs: Array<HTMLElement | null> = [];
		const fixtureProps = {
			theme: 'day',
			onEditor: function onEditor(currentEditor: Editor) {
				editor = currentEditor;
			},
			onRenderer: function onRenderer() {},
			onDirectLifecycle: function onDirectLifecycle() {},
			onNodeLifecycle: function onNodeLifecycle() {},
			onNodeRef: function onNodeRef() {},
			onMarkLifecycle: function onMarkLifecycle(phase: string) {
				markLifecycle.push(phase);
			},
			onMarkRef: function onMarkRef(element: HTMLElement | null) {
				markRefs.push(element);
			},
		};
		const result = mount(CustomViewsEditor as any, fixtureProps);
		await settlePortals();

		if (!editor) {
			throw new Error('Expected useEditor to create the custom-view editor.');
		}

		expect(result.find('[data-badge-mark-view]')).toBeTruthy();
		expect(markLifecycle).toEqual(['mount']);

		const markedRange = findMarkedRange(editor);
		editor.chain().setTextSelection(markedRange).unsetMark('badgeMark').run();
		await nextPaint();
		await settlePortals();

		expect(result.container.querySelector('[data-badge-mark-view]')).toBe(null);
		expect(result.container.querySelector('[data-mark-view-content]')).toBe(null);
		expect(editor.getText()).toContain('Marked text');
		expect(markLifecycle).toEqual(['mount', 'cleanup']);
		expect(markRefs.at(-1)).toBe(null);

		result.unmount();
		flushEffects();
		editor.destroy();
	});
});
