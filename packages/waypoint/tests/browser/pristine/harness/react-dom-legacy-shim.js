/**
 * Upstream's Karma suite still calls ReactDOM.render / unmountComponentAtNode /
 * findDOMNode. React 19 removed those APIs; flushSync keeps the suite's
 * synchronous mount timing intact, and findDOMNode is only needed for host
 * nodes returned by this shim's render().
 */
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';

const roots = new WeakMap();

function render(element, container) {
	let root = roots.get(container);
	if (!root) {
		root = createRoot(container);
		roots.set(container, root);
	}
	flushSync(function commit() {
		root.render(element);
	});
	return container.firstElementChild ?? container;
}

function unmountComponentAtNode(container) {
	const root = roots.get(container);
	if (!root) return false;
	flushSync(function unmount() {
		root.unmount();
	});
	roots.delete(container);
	return true;
}

function findDOMNode(componentOrElement) {
	if (componentOrElement == null) return null;
	if (componentOrElement.nodeType) return componentOrElement;
	throw new Error('findDOMNode shim only supports host nodes returned by render()');
}

const ReactDOM = {
	render,
	unmountComponentAtNode,
	findDOMNode,
};

export { render, unmountComponentAtNode, findDOMNode };
export default ReactDOM;
