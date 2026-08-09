import { mergeCSSClasses } from '@blocknote/core';
import { createElement, flushSync } from 'octane';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BlockNoteContext } from '../../src/editor/BlockNoteContext.ts';
import { getContentComponent, Portals } from '../../src/editor/EditorContent.tsrx';
import { useActiveStyles } from '../../src/hooks/useActiveStyles.ts';
import { useEditorChange } from '../../src/hooks/useEditorChange.ts';
import { useEditorDOMElement } from '../../src/hooks/useEditorDomElement.ts';
import { useEditorSelectionBoundingBox } from '../../src/hooks/useEditorSelectionBoundingBox.ts';
import { useFocusWithin } from '../../src/hooks/useFocusWithin.ts';
import { useSelectedBlocks } from '../../src/hooks/useSelectedBlocks.ts';
import { useUploadLoading } from '../../src/hooks/useUploadLoading.ts';
import { withoutSlot } from '../../src/hooks/without-slot.ts';
import { flushEffects, mount } from '../../../octane/tests/_helpers';

let lastUseEditorStateOptions: { editor: unknown } | undefined;

vi.mock('../../src/hooks/useEditorState.ts', function () {
	return {
		useEditorState: function (options: {
			editor: unknown;
			selector: (snapshot: { editor: unknown }) => unknown;
		}) {
			lastUseEditorStateOptions = { editor: options.editor };
			if (options.editor == null || typeof options.editor === 'symbol') {
				return undefined;
			}
			return options.selector({ editor: options.editor });
		},
	};
});

let uploadStartCallback: ((blockId?: string) => void) | undefined;
let uploadEndCallback: ((blockId?: string) => void) | undefined;

vi.mock('../../src/hooks/useOnUploadStart.ts', () => ({
	useOnUploadStart: (callback: (blockId?: string) => void) => {
		uploadStartCallback = callback;
	},
}));

vi.mock('../../src/hooks/useOnUploadEnd.ts', () => ({
	useOnUploadEnd: (callback: (blockId?: string) => void) => {
		uploadEndCallback = callback;
	},
}));

function settle(): void {
	flushEffects();
	flushSync(function () {});
	flushEffects();
}

afterEach(function () {
	document.body.replaceChildren();
	uploadStartCallback = undefined;
	uploadEndCallback = undefined;
	lastUseEditorStateOptions = undefined;
});

describe('@octanejs/blocknote Octane port regressions', function () {
	it('withoutSlot strips compiler slot symbols before hook defaults run', function () {
		expect(withoutSlot(Symbol('slot'))).toBeUndefined();
	});

	it('useEditorDOMElement ignores compiler slot symbols and reads context editor', function () {
		const domElement = document.createElement('div');
		const editor = { domElement };
		let observed: unknown;

		function Probe() {
			observed = useEditorDOMElement(Symbol('slot') as never);
			return createElement('div', { 'data-probe': true });
		}

		mount(function Wrapper() {
			return createElement(BlockNoteContext.Provider, { value: { editor } }, createElement(Probe));
		});
		settle();

		expect(observed).toBe(domElement);
	});

	it('useActiveStyles ignores compiler slot symbols and reads context editor', function () {
		const contextEditor = {
			getActiveStyles: function () {
				return { bold: true };
			},
		};
		let styles: unknown;

		function Probe() {
			styles = useActiveStyles(Symbol('slot') as never);
			return createElement('div', { 'data-probe': true });
		}

		mount(function Wrapper() {
			return createElement(
				BlockNoteContext.Provider,
				{ value: { editor: contextEditor } },
				createElement(Probe),
			);
		});
		settle();

		expect(styles).toEqual({ bold: true });
	});

	it('useSelectedBlocks strips compiler slots before useEditorState', function () {
		function Probe() {
			useSelectedBlocks(Symbol('slot') as never);
			return createElement('div', { 'data-probe': true });
		}

		mount(Probe);
		settle();

		expect(lastUseEditorStateOptions?.editor).toBeUndefined();
	});

	it('useEditorSelectionBoundingBox strips slot from one-arg enabled calls', function () {
		function Probe() {
			useEditorSelectionBoundingBox(true, Symbol('slot') as never);
			return createElement('div', { 'data-probe': true });
		}

		mount(Probe);
		settle();

		expect(lastUseEditorStateOptions?.editor).toBeUndefined();
	});

	it('useEditorChange ignores compiler slot symbols and reads context editor', function () {
		const contextEditor = {
			onChange: vi.fn(function () {
				return function () {};
			}),
		};

		function Probe() {
			useEditorChange(function () {}, Symbol('slot') as never);
			return createElement('div', { 'data-probe': true });
		}

		mount(function Wrapper() {
			return createElement(
				BlockNoteContext.Provider,
				{ value: { editor: contextEditor } },
				createElement(Probe),
			);
		});
		settle();

		expect(contextEditor.onChange).toHaveBeenCalled();
	});

	it('useFocusWithin accepts a bare compiler slot without throwing', function () {
		let result: ReturnType<typeof useFocusWithin> | undefined;

		function Probe() {
			result = useFocusWithin(Symbol('slot') as never);
			return createElement('div', { ref: result.ref, 'data-probe': true });
		}

		mount(Probe);
		settle();

		expect(result).toBeTruthy();
		expect(result?.focused).toBe(false);
		expect(result?.ref.current).toBeTruthy();
	});

	it('useUploadLoading matches upload events when called with a bare compiler slot', function () {
		let loading = false;

		function Probe() {
			loading = useUploadLoading(Symbol('slot') as never);
			return createElement('div', { 'data-loading': loading ? 'true' : 'false' });
		}

		mount(Probe);
		settle();

		expect(loading).toBe(false);
		uploadStartCallback?.('block-1');
		settle();
		expect(loading).toBe(false);

		uploadStartCallback?.(undefined);
		settle();
		expect(loading).toBe(true);
	});

	it('useUploadLoading tracks the requested block id', function () {
		let loading = false;

		function Probe() {
			loading = useUploadLoading('block-1');
			return createElement('div', { 'data-loading': loading ? 'true' : 'false' });
		}

		mount(Probe);
		settle();

		uploadStartCallback?.('block-1');
		settle();
		expect(loading).toBe(true);

		uploadEndCallback?.('block-1');
		settle();
		expect(loading).toBe(false);
	});

	it('BlockNoteView container class prop merges user classes with bn-root', function () {
		const merged = mergeCSSClasses('bn-root', 'bn-container', 'light', 'custom-theme');
		expect(merged).toContain('custom-theme');
		expect(merged).toContain('bn-root');
		expect(merged).toContain('bn-container');
	});

	it('EditorContent portals keep survivor identity when a sibling renderer is removed', function () {
		const registry = getContentComponent();
		const hostA = document.createElement('div');
		const hostB = document.createElement('div');
		document.body.append(hostA, hostB);

		registry.setRenderer('alpha', {
			reactElement: createElement('span', { 'data-id': 'alpha' }, 'Alpha'),
			element: hostA,
		} as never);
		registry.setRenderer('beta', {
			reactElement: createElement('span', { 'data-id': 'beta' }, 'Beta'),
			element: hostB,
		} as never);

		const result = mount(Portals as never, { contentComponent: registry });
		settle();

		const alphaBefore = hostA.querySelector('[data-id="alpha"]');
		const betaBefore = hostB.querySelector('[data-id="beta"]');
		expect(alphaBefore).toBeTruthy();
		expect(betaBefore).toBeTruthy();

		registry.removeRenderer('beta');
		settle();

		const alphaAfter = hostA.querySelector('[data-id="alpha"]');
		expect(alphaAfter).toBe(alphaBefore);
		expect(hostB.querySelector('[data-id="beta"]')).toBeNull();
		expect(result.container.childNodes.length).toBeGreaterThan(0);
	});

	it('EditorContent createPortal stores registry ids on entries, not portal props', function () {
		const registry = getContentComponent();
		const host = document.createElement('div');

		registry.setRenderer('node-1', {
			reactElement: createElement('em', null, 'Node'),
			element: host,
		} as never);

		const entry = registry.getSnapshot()['node-1'];
		expect(entry.id).toBe('node-1');
		expect(entry.portal).toBeTruthy();
		expect((entry.portal as { props?: { id?: string } }).props?.id).toBeUndefined();
	});
});
