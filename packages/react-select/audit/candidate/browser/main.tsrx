import './main.mjs';

import React from 'react';
import { createRoot as createReactRoot } from 'react-dom/client';
import { flushSync as flushReact } from 'react-dom';
import { useStateManager as useReactStateManager } from 'react-select';
import { createRoot, flushSync } from 'octane';

import { MenuPortal, type MenuPortalProps } from '../../../src/components.tsrx';
import { defaultStyles } from '../../../src/default-styles';
import { defaultTheme } from '../../../src/theme';
import { classNames } from '../../../src/utils';
import {
	StateManagerFixture,
	type StateManagerResult,
} from './state-manager-fixture.tsrx';

const rootElement = document.getElementById('root');
const portalTarget = document.getElementById('portal-target');
if (!rootElement || !portalTarget) throw new Error('missing browser fixture roots');

const controlElement = document.createElement('div');
controlElement.id = 'control-element';
document.body.appendChild(controlElement);

let rect = { left: 40, width: 180, top: 50, bottom: 80, height: 30 };
controlElement.getBoundingClientRect = () => ({
	...rect,
	right: rect.left + rect.width,
	x: rect.left,
	y: rect.top,
	toJSON: () => ({}),
});

const common = {
	className: 'consumer-portal',
	cx: (state: Record<string, boolean>, ...names: (string | undefined)[]) =>
		classNames('probe', state, ...names.filter((name): name is string => name !== undefined)),
	getClassNames: (name: string) => `custom-${name}`,
	getStyles: (name: string, componentProps: unknown) =>
		defaultStyles[name as keyof typeof defaultStyles](componentProps as never, false),
	hasValue: false,
	isMulti: false,
	isRtl: false,
	selectProps: { controlShouldRenderValue: true },
	theme: defaultTheme,
};

const root = createRoot(rootElement);

function render(appendTo: HTMLElement | undefined, menuPosition: 'absolute' | 'fixed') {
	const props: MenuPortalProps = {
		...common,
		appendTo,
		controlElement,
		innerProps: { id: 'menu-portal', 'data-contract': 'forwarded' },
		menuPlacement: 'bottom',
		menuPosition,
		children: <span>Portal child</span>,
	};
	root.render(MenuPortal, props);
	flushSync(() => {});
}

function snapshot() {
	const element = document.getElementById('menu-portal');
	if (!element) return null;
	const style = getComputedStyle(element);
	return {
		child: element.textContent,
		forwarded: element.getAttribute('data-contract'),
		id: element.id,
		parent: element.parentElement?.id,
		position: style.position,
		left: style.left,
		top: style.top,
		width: style.width,
		zIndex: style.zIndex,
	};
}

render(portalTarget, 'absolute');

window.__reactSelectPortal = {
	snapshot,
	async moveControl() {
		rect = { left: 75, width: 240, top: 90, bottom: 130, height: 40 };
		window.dispatchEvent(new Event('resize'));
		await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
		return snapshot();
	},
	async renderFixed() {
		render(undefined, 'fixed');
		await new Promise((resolve) => requestAnimationFrame(resolve));
		return snapshot();
	},
	unmount() {
		root.unmount();
		controlElement.remove();
		return {
			portalChildren: portalTarget.childElementCount,
			rootChildren: rootElement.childElementCount,
		};
	},
};

declare global {
	interface Window {
		__reactSelectPortal: {
			snapshot: typeof snapshot;
			moveControl(): Promise<ReturnType<typeof snapshot>>;
			renderFixed(): Promise<ReturnType<typeof snapshot>>;
			unmount(): { portalChildren: number; rootChildren: number };
		};
	}
}

const octaneStateElement = document.getElementById('octane-state-root');
const reactStateElement = document.getElementById('react-state-root');
if (!octaneStateElement || !reactStateElement) throw new Error('missing state manager roots');

type Option = { label: string; value: string };
type ManagerResult = StateManagerResult & Record<string, unknown>;
const logs = { octane: [] as string[], react: [] as string[] };
let octaneManager!: ManagerResult;
let reactManager!: ManagerResult;

function managerProps(engine: 'octane' | 'react', controlled = false) {
	return {
		defaultInputValue: 'initial',
		defaultMenuIsOpen: false,
		defaultValue: { label: 'Default', value: 'default' },
		...(controlled
			? {
					inputValue: 'controlled',
					menuIsOpen: false,
					value: { label: 'Controlled', value: 'controlled' },
				}
			: {}),
		onChange() {
			logs[engine].push('change');
		},
		onInputChange(value: string) {
			logs[engine].push(`input:${value}`);
			return value.toUpperCase();
		},
		onMenuOpen() {
			logs[engine].push('open');
		},
		onMenuClose() {
			logs[engine].push('close');
		},
		consumerProp: 'preserved',
	};
}

function ReactStateManagerFixture(props: { controlled: boolean }) {
	reactManager = useReactStateManager<Option, false, never, Record<string, unknown>>(
		managerProps('react', props.controlled) as never,
	) as ManagerResult;
	return null;
}

const octaneStateRoot = createRoot(octaneStateElement);
const reactStateRoot = createReactRoot(reactStateElement);

function renderManagers(controlled = false) {
	flushSync(() => {
		octaneStateRoot.render(StateManagerFixture, {
			bind: (result) => {
				octaneManager = result as ManagerResult;
			},
			managerProps: managerProps('octane', controlled),
		});
	});
	flushReact(() => {
		reactStateRoot.render(React.createElement(ReactStateManagerFixture, { controlled }));
	});
}

function managerSnapshot(result: ManagerResult) {
	return {
		consumerProp: result.consumerProp,
		inputValue: result.inputValue,
		menuIsOpen: result.menuIsOpen,
		value: result.value,
	};
}

function snapshotManagers() {
	return {
		octane: managerSnapshot(octaneManager),
		react: managerSnapshot(reactManager),
		logs: { octane: [...logs.octane], react: [...logs.react] },
	};
}

renderManagers();

window.__reactSelectStateManager = {
	snapshot: snapshotManagers,
	async exerciseUncontrolled() {
		const option = { label: 'Next', value: 'next' };
		flushSync(() => {
			octaneManager.onInputChange?.('typed', {
				action: 'input-change',
				prevInputValue: 'initial',
			});
			octaneManager.onMenuOpen?.();
			octaneManager.onChange?.(option, { action: 'select-option', option });
		});
		flushReact(() => {
			reactManager.onInputChange?.('typed', {
				action: 'input-change',
				prevInputValue: 'initial',
			});
			reactManager.onMenuOpen?.();
			reactManager.onChange?.(option, { action: 'select-option', option });
		});
		await Promise.resolve();
		return snapshotManagers();
	},
	async exerciseControlled() {
		renderManagers(true);
		const option = { label: 'Ignored', value: 'ignored' };
		flushSync(() => {
			octaneManager.onInputChange?.('ignored', {
				action: 'input-change',
				prevInputValue: 'controlled',
			});
			octaneManager.onMenuOpen?.();
			octaneManager.onChange?.(option, { action: 'select-option', option });
		});
		flushReact(() => {
			reactManager.onInputChange?.('ignored', {
				action: 'input-change',
				prevInputValue: 'controlled',
			});
			reactManager.onMenuOpen?.();
			reactManager.onChange?.(option, { action: 'select-option', option });
		});
		await Promise.resolve();
		return snapshotManagers();
	},
};

declare global {
	interface Window {
		__reactSelectStateManager: {
			snapshot: typeof snapshotManagers;
			exerciseUncontrolled(): Promise<ReturnType<typeof snapshotManagers>>;
			exerciseControlled(): Promise<ReturnType<typeof snapshotManagers>>;
		};
	}
}
