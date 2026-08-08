import { mergeCSSClasses } from '@blocknote/core';
import { createElement, flushSync } from 'octane';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BlockNoteContext } from '../../src/editor/BlockNoteContext.ts';
import { getContentComponent, Portals } from '../../src/editor/EditorContent.tsrx';
import { useEditorDOMElement } from '../../src/hooks/useEditorDomElement.ts';
import { withoutSlot } from '../../src/hooks/without-slot.ts';
import { flushEffects, mount } from '../../../octane/tests/_helpers';

vi.mock('../../src/hooks/useEditorState.ts', () => ({
	useEditorState: ({ editor, selector }: { editor: unknown; selector: (snapshot: { editor: unknown }) => unknown }) =>
		selector({ editor }),
}));

function settle(): void {
	flushEffects();
	flushSync(function () {});
	flushEffects();
}

afterEach(function () {
	document.body.replaceChildren();
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
			return createElement(
				BlockNoteContext.Provider,
				{ value: { editor } },
				createElement(Probe),
			);
		});
		settle();

		expect(observed).toBe(domElement);
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
