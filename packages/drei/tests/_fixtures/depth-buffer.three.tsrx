import { useDepthBuffer } from '@octanejs/drei';

export function DepthBufferScene(props) @{
	const texture = useDepthBuffer({ size: props.size, frames: props.frames });
	props.onTexture(texture);
	null;
}
