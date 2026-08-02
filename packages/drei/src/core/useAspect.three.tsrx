import { useThree } from '@octanejs/three';

export function useAspect(width: number, height: number, factor = 1): [number, number, number] {
	const viewport = useThree((state) => state.viewport);
	const scale =
		viewport.aspect > width / height ? viewport.width / width : viewport.height / height;
	return [width * scale * factor, height * scale * factor, 1];
}
