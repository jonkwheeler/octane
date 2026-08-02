/** @jsxImportSource @octanejs/three/intrinsics */
import { useLoader } from '@octanejs/three';
import type { OctaneNode } from 'octane';
import { CubeTexture as ThreeCubeTexture, CubeTextureLoader, type Texture } from 'three';

export interface CubeTextureOptions {
	path: string;
}

export function useCubeTexture(files: string[], { path }: CubeTextureOptions): ThreeCubeTexture {
	const [cubeTexture] = useLoader(CubeTextureLoader, [files], (loader) => loader.setPath(path));
	return cubeTexture;
}

useCubeTexture.preload = (files: string[], { path }: CubeTextureOptions) => useLoader.preload(
	CubeTextureLoader,
	[files],
	(loader) => loader.setPath(path),
);

export type CubeTextureProps =
	CubeTextureOptions & {
		children?: (texture: Texture) => OctaneNode;
		files: Parameters<typeof useCubeTexture>[0];
	};

export function CubeTexture({ children, files, ...options }: CubeTextureProps) @{
	const texture = useCubeTexture(files, options);
	<>
		{children?.(texture)}
	</>
}
