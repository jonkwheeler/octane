import { useFrame, useThree } from '@octanejs/three';
import { useMemo } from '@octanejs/three/renderer';
import { DepthFormat, DepthTexture, UnsignedShortType } from 'three';
import { useFBO } from './Fbo.three.tsrx';

export function useDepthBuffer(
	{
		size = 256,
		frames = Infinity,
	}: {
		size?: number;
		frames?: number;
	} = {},
) {
	const dpr = useThree((state) => state.viewport.dpr);
	const { width, height } = useThree((state) => state.size);
	const targetWidth = size || width * dpr;
	const targetHeight = size || height * dpr;
	const depthConfig = useMemo(() => {
		const depthTexture = new DepthTexture(targetWidth, targetHeight);
		depthTexture.format = DepthFormat;
		depthTexture.type = UnsignedShortType;
		return { depthTexture };
	}, [targetWidth, targetHeight]);
	let count = 0;
	const depthFbo = useFBO(targetWidth, targetHeight, depthConfig);
	useFrame((state) => {
		if (frames === Infinity || count < frames) {
			state.gl.setRenderTarget?.(depthFbo);
			state.gl.render(state.scene, state.camera);
			state.gl.setRenderTarget?.(null);
			count++;
		}
	});
	return depthFbo.depthTexture;
}
