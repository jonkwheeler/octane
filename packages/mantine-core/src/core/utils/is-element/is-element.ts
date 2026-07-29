import type { ElementDescriptor } from 'octane';
import { Fragment } from 'octane';

export function isElement(value: any): value is ElementDescriptor {
  if (Array.isArray(value) || value === null) {
    return false;
  }

  if (typeof value === 'object') {
    if (value.type === Fragment) {
      return false;
    }

    return true;
  }

  return false;
}
