import type { ReactNode } from 'react';
import type { PortalProps } from '../../upstream/src/portal.tsx';
import {
	mergeProps,
	normalizeProps,
	Portal,
	useMachine,
	useSyncExternalStore,
} from '../../upstream/src/index.ts';

declare function expectType<T>(value: T): void;

expectType<typeof useMachine>(useMachine);
expectType<typeof mergeProps>(mergeProps);
expectType<typeof normalizeProps>(normalizeProps);
expectType<typeof Portal>(Portal);
expectType<typeof useSyncExternalStore>(useSyncExternalStore);

type PortalChildren = Parameters<typeof Portal>[0]['children'];
expectType<ReactNode | undefined>(null as unknown as PortalChildren);

type Disabled = PortalProps['disabled'];
expectType<boolean | undefined>(null as unknown as Disabled);

// @ts-expect-error useMachine requires a machine argument
useMachine();

// @ts-expect-error mergeProps requires object arguments
mergeProps(null);
