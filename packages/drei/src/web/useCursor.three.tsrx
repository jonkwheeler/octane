import { useEffect } from '@octanejs/three/renderer';

export function useCursor(
	hovered: boolean,
	onPointerOver = 'pointer',
	onPointerOut = 'auto',
	container: HTMLElement = document.body,
) {
	useEffect(() => {
		if (hovered) {
			container.style.cursor = onPointerOver;
			return () => void (container.style.cursor = onPointerOut);
		}
	}, [hovered]);
}
