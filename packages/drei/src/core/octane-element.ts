import { isChildrenBlock, isValidElement } from 'octane';

/** Keeps renderer-neutral element detection outside universal compiler imports. */
export const isOctaneElement: typeof isValidElement = isValidElement;

/** Distinguishes compiled child blocks from user-authored render-prop functions. */
export const isOctaneChildrenBlock: typeof isChildrenBlock = isChildrenBlock;
