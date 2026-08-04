import type { Instance, State } from '@popperjs/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { flushSync } from 'octane';
import * as ReactPopper from '@octanejs/react-popper';
import { flushEffects, mount } from '../../../octane/tests/_helpers';
import {
	BareReferenceHarness,
	ManagedPopperHarness,
	UsePopperHarness,
} from './_fixtures/Harness.tsrx';

const roots: Array<{ unmount: () => void }> = [];
function tracked(...args: Parameters<typeof mount<any>>) {
	const root = mount<any>(...args);
	roots.push(root);
	return root;
}
function settle() {
	flushEffects();
	flushSync(() => {});
}
afterEach(() => {
	for (const root of roots.splice(0)) root.unmount();
	vi.restoreAllMocks();
});

function fakeState(reference: Element, popper: HTMLElement, arrow?: HTMLElement): State {
	return {
		placement: 'bottom',
		orderedModifiers: [],
		options: { placement: 'bottom', modifiers: [], strategy: 'absolute' },
		modifiersData: {},
		elements: { reference, popper, ...(arrow ? { arrow } : {}) },
		attributes: { popper: { 'data-popper-placement': 'bottom' } },
		styles: {
			popper: { position: 'absolute', transform: 'translate(4px, 8px)' },
			...(arrow ? { arrow: { position: 'absolute', transform: 'translate(2px, 0px)' } } : {}),
		},
		scrollParents: { reference: [], popper: [] },
		rect: {
			reference: { x: 0, y: 0, width: 10, height: 10 },
			popper: { x: 4, y: 8, width: 5, height: 5 },
		},
		reset: false,
	} as State;
}

function oracle() {
	const instances: Instance[] = [];
	const createPopper = vi.fn((reference: Element, popper: HTMLElement, options: any) => {
		const arrow = options.modifiers.find((modifier: any) => modifier.name === 'arrow')?.options
			?.element as HTMLElement | undefined;
		const state = fakeState(reference, popper, arrow);
		const instance = {
			state,
			setOptions: vi.fn(async () => state),
			forceUpdate: vi.fn(() => state),
			update: vi.fn(async () => state),
			destroy: vi.fn(),
		} as unknown as Instance;
		instances.push(instance);
		const updateState = options.modifiers.find((modifier: any) => modifier.name === 'updateState');
		queueMicrotask(() => updateState.fn({ state, instance, options, name: 'updateState' }));
		return instance;
	});
	return { createPopper, instances };
}

describe('@octanejs/react-popper public contract', () => {
	// @parity-case adapted:react-popper-runtime
	it('exports the exact upstream runtime surface', () => {
		expect(Object.keys(ReactPopper).sort()).toEqual([
			'Manager',
			'Popper',
			'Reference',
			'usePopper',
		]);
	});

	it('initializes usePopper with upstream defaults and publishes state/styles/actions', async () => {
		const reference = document.createElement('button');
		const popper = document.createElement('div');
		const mock = oracle();
		const root = tracked(UsePopperHarness, {
			referenceElement: reference,
			popperElement: popper,
			createPopper: mock.createPopper,
		});
		settle();
		await Promise.resolve();
		settle();
		expect(mock.createPopper).toHaveBeenCalledTimes(1);
		const options = mock.createPopper.mock.calls[0][2];
		expect(options.placement).toBe('bottom');
		expect(options.strategy).toBe('absolute');
		expect(
			options.modifiers.slice(-2).map((modifier: any) => [modifier.name, modifier.enabled]),
		).toEqual([
			['updateState', true],
			['applyStyles', false],
		]);
		const result = root.find('#result');
		expect(result.getAttribute('data-state')).toBe('bottom');
		expect(result.getAttribute('data-update')).toBe('true');
		expect(result.getAttribute('data-force-update')).toBe('true');
	});

	it('keeps an instance for equivalent options, uses setOptions for option changes, and recreates for element changes', () => {
		const reference = document.createElement('button');
		const firstPopper = document.createElement('div');
		const secondPopper = document.createElement('div');
		const mock = oracle();
		const props = {
			referenceElement: reference,
			popperElement: firstPopper,
			createPopper: mock.createPopper,
		};
		const root = tracked(UsePopperHarness, props);
		settle();
		const initialSetOptionsCalls = (mock.instances[0].setOptions as any).mock.calls.length;
		root.update(UsePopperHarness, { ...props, options: { ignored: 'value' } });
		settle();
		expect((mock.instances[0].setOptions as any).mock.calls.length).toBe(initialSetOptionsCalls);
		root.update(UsePopperHarness, { ...props, modifiers: [] });
		settle();
		expect(mock.createPopper).toHaveBeenCalledTimes(1);
		root.update(UsePopperHarness, { ...props, placement: 'top' });
		settle();
		expect(mock.instances[0].setOptions).toHaveBeenCalled();
		expect(mock.createPopper).toHaveBeenCalledTimes(1);
		const firstArrow = document.createElement('span');
		const secondArrow = document.createElement('span');
		const setOptionsCalls = (mock.instances[0].setOptions as any).mock.calls.length;
		root.update(UsePopperHarness, {
			...props,
			modifiers: [{ name: 'arrow', options: { element: firstArrow } }],
		});
		settle();
		root.update(UsePopperHarness, {
			...props,
			modifiers: [{ name: 'arrow', options: { element: secondArrow } }],
		});
		settle();
		expect((mock.instances[0].setOptions as any).mock.calls.length).toBe(setOptionsCalls + 2);
		root.update(UsePopperHarness, { ...props, popperElement: secondPopper });
		settle();
		expect(mock.instances[0].destroy).toHaveBeenCalledTimes(1);
		expect(mock.createPopper).toHaveBeenCalledTimes(2);
	});

	it('destroys usePopper instances on unmount and initializes arrow styles', async () => {
		const reference = document.createElement('button');
		const popper = document.createElement('div');
		const arrow = document.createElement('div');
		const mock = oracle();
		const root = tracked(UsePopperHarness, {
			referenceElement: reference,
			popperElement: popper,
			createPopper: mock.createPopper,
			modifiers: [{ name: 'arrow', options: { element: arrow } }],
		});
		settle();
		expect(root.find('#result').getAttribute('data-arrow-position')).toBe('absolute');
		await Promise.resolve();
		settle();
		expect(root.find('#result').getAttribute('data-arrow-transform')).toBe('translate(2px, 0px)');
		root.unmount();
		roots.pop();
		expect(mock.instances[0].destroy).toHaveBeenCalledTimes(1);
	});

	it('Manager connects Reference and Popper, preserves placement, and wires arrow/fallback actions', () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		let snapshot: any;
		const root = tracked(ManagedPopperHarness, {
			placement: 'top',
			onSnapshot: (value: any) => {
				snapshot = value;
			},
		});
		settle();
		expect(root.find('#reference')).toBeInstanceOf(HTMLButtonElement);
		expect(root.find('#popper').getAttribute('data-placement')).toBe('top');
		expect(snapshot.ref).toBeTypeOf('function');
		expect(snapshot.arrowProps.ref).toBeTypeOf('function');
		expect(snapshot.update()).toBeInstanceOf(Promise);
		expect(snapshot.forceUpdate).toBeTypeOf('function');
		expect(error).not.toHaveBeenCalled();
	});

	it('supports callback and object innerRef values', () => {
		const callback = vi.fn();
		const object = { current: null as HTMLElement | null };
		const first = tracked(ManagedPopperHarness, { innerRef: callback });
		settle();
		expect(callback).toHaveBeenCalledWith(first.find('#popper'));
		first.unmount();
		roots.shift();
		settle();
		const second = tracked(ManagedPopperHarness, { innerRef: object });
		settle();
		expect(object.current).toBe(second.find('#popper'));
	});

	it('explicit virtual reference takes precedence and placement updates without replacing markup', () => {
		const virtualReference = { getBoundingClientRect: () => new DOMRect(10, 10, 90, 10) };
		const root = tracked(ManagedPopperHarness, {
			referenceElement: virtualReference,
			placement: 'top',
		});
		settle();
		const popper = root.find('#popper');
		root.update(ManagedPopperHarness, { referenceElement: virtualReference, placement: 'bottom' });
		settle();
		expect(root.find('#popper')).toBe(popper);
		expect(popper.getAttribute('data-placement')).toBe('bottom');
	});

	it('Reference warns outside Manager, assigns its ref, and clears innerRef', () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {});
		const innerRef = vi.fn();
		const root = tracked(BareReferenceHarness, { innerRef });
		settle();
		expect(innerRef).toHaveBeenCalledWith(root.find('#reference'));
		expect(error).toHaveBeenCalledWith(
			'Warning: `Reference` should not be used outside of a `Manager` component.',
		);
		root.unmount();
		roots.pop();
		expect(innerRef).toHaveBeenLastCalledWith(null);
	});
});
