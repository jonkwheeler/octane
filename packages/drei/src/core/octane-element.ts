import { isValidElement } from 'octane';

/** Keeps renderer-neutral element detection outside universal compiler imports. */
export const isOctaneElement: typeof isValidElement = isValidElement;
