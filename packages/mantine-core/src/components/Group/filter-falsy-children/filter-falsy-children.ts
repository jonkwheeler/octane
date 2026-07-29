import type { ElementDescriptor, OctaneNode } from 'octane';
import { Children } from 'octane';

export function filterFalsyChildren(children: OctaneNode) {
  return (Children.toArray(children) as ElementDescriptor[]).filter(Boolean);
}
