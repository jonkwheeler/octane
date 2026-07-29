import type { OctaneNode } from 'octane';
import { Children } from 'octane';
import { isElement } from '../is-element/is-element';

export function getSingleElementChild(children: OctaneNode) {
  const _children = Children.toArray(children);
  if (_children.length !== 1 || !isElement(_children[0])) {
    return null;
  }
  return _children[0];
}
