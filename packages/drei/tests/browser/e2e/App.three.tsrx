/** @jsxImportSource @octanejs/three/intrinsics */
import { CameraControls, Environment, Sphere } from '@octanejs/drei';

export function Scene() @{
	if (!(globalThis as typeof globalThis & { __dreiE2eMounted?: boolean }).__dreiE2eMounted) {
		(globalThis as typeof globalThis & { __dreiE2eMounted?: boolean }).__dreiE2eMounted = true;
		document.dispatchEvent(new Event('playright:r3f'));
	}

	<>
		<Sphere>
			<meshStandardMaterial roughness={0} metalness={1} />
		</Sphere>
		<Environment preset="city" />
		<CameraControls />
	</>
}
