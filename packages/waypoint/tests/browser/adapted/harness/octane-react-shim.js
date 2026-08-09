/**
 * Minimal React-shaped facade so the adapted browser suite can keep upstream's
 * JSX/createElement call shape while rendering through Octane.
 */
import {
	cloneElement,
	createElement,
	createRoot,
	drainPassiveEffects,
	flushSync,
	isValidElement,
	useState,
} from 'octane';

const roots = new WeakMap();

function Component(props) {
	this.props = props;
}

Component.prototype.render = function render() {
	return null;
};

function PureComponent(props) {
	Component.call(this, props);
}
PureComponent.prototype = Object.create(Component.prototype);
PureComponent.prototype.constructor = PureComponent;

function Fragment(props) {
	return props.children;
}

const React = {
	Component,
	PureComponent,
	Fragment,
	createElement,
	cloneElement,
	isValidElement,
};

export function render(element, container) {
	let root = roots.get(container);
	if (!root) {
		root = createRoot(container);
		roots.set(container, root);
	}
	root.render(element);
	flushSync(function flush() {});
	drainPassiveEffects();
	return container.firstElementChild ?? container;
}

export function unmountComponentAtNode(container) {
	const root = roots.get(container);
	if (!root) return false;
	flushSync(function unmount() {
		root.unmount();
	});
	roots.delete(container);
	return true;
}

export function findDOMNode(componentOrElement) {
	if (componentOrElement == null) return null;
	if (componentOrElement.nodeType) return componentOrElement;
	throw new Error('findDOMNode shim only supports host nodes returned by render()');
}

export const ReactDOM = {
	render,
	unmountComponentAtNode,
	findDOMNode,
};

export default React;
export { createElement, cloneElement, isValidElement, Component, PureComponent, useState };
