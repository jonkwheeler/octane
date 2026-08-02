import { useThree } from '@octanejs/three';
import { useEffect, useLayoutEffect, useMemo } from '@octanejs/three/renderer';
import * as THREE from 'three';

type FBOSettings =
	{
		/** @deprecated use `depthBuffer` instead. */
		depth?: boolean;
	} & THREE.RenderTargetOptions;

export function useFBO(width?: number | FBOSettings, height?: number, settings?: FBOSettings) {
	const size = useThree((state) => state.size);
	const viewport = useThree((state) => state.viewport);
	const targetWidth =
		typeof width === 'number' ? width : size.width * viewport.dpr;
	const targetHeight =
		typeof height === 'number' ? height : size.height * viewport.dpr;
	const resolvedSettings = (typeof width === 'number' ? settings : width) || {};
	const { samples = 0, depth, ...targetSettings } = resolvedSettings;
	const depthBuffer = depth ?? resolvedSettings.depthBuffer;
	const target = useMemo(() => {
		const value = new THREE.WebGLRenderTarget(targetWidth, targetHeight, {
			minFilter: THREE.LinearFilter,
			magFilter: THREE.LinearFilter,
			type: THREE.HalfFloatType,
			...targetSettings,
		});
		if (depthBuffer) {
			value.depthTexture = new THREE.DepthTexture(targetWidth, targetHeight, THREE.FloatType);
		}
		value.samples = samples;
		return value;
	}, []);
	useLayoutEffect(() => {
		target.setSize(targetWidth, targetHeight);
		if (samples) target.samples = samples;
	}, [samples, target, targetWidth, targetHeight]);
	useEffect(() => () => target.dispose(), []);
	return target;
}

type UseFBOParams = Parameters<typeof useFBO>;
type FBO = ReturnType<typeof useFBO>;

export type FboProps =
	{
		children?: (target: FBO) => unknown;
		width?: UseFBOParams[0];
		height?: UseFBOParams[1];
	} & FBOSettings;

export function Fbo({ children, width, height, ref, ...settings }: FboProps & {
	ref?: { current: FBO | null } | ((value: FBO | null) => void);
}) @{
	const target = useFBO(width, height, settings);
	useLayoutEffect(() => {
		if (typeof ref === 'function') ref(target);
		else if (ref) ref.current = target;
		return () => {
			if (typeof ref === 'function') ref(null);
			else if (ref) ref.current = null;
		};
	}, [ref, target]);
	{
		children?.(target);
	}
}
