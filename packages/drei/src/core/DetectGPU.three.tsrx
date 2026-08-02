/** @jsxImportSource @octanejs/three/intrinsics */
import { use } from '@octanejs/three/renderer';
import { getGPUTier, type GetGPUTier } from 'detect-gpu';
import type { OctaneNode } from 'octane';
import { resourcePromise } from './resource.js';

export const useDetectGPU = (props?: GetGPUTier) =>
	use(resourcePromise(() => getGPUTier(props), ['useDetectGPU']));

export type DetectGPUProps = {
	children?: (result: ReturnType<typeof useDetectGPU>) => OctaneNode;
} & Parameters<typeof useDetectGPU>[0];

export function DetectGPU({ children, ...options }: DetectGPUProps) @{
	const result = useDetectGPU(options);
	<>
		{children?.(result)}
	</>
}
