import type { OctaneNode } from 'octane';

export type SyncReactNode = Exclude<OctaneNode, Promise<unknown>>;
