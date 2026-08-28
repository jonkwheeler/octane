import { useEffect, useRef, useState } from 'octane';

const useSpring = (targetValue = 0, tension = 50, friction = 3) => {
	const [value, setValue] = useState(targetValue);
	const valueRef = useRef(value);
	useEffect(() => {
		if (typeof requestAnimationFrame === 'undefined') {
			valueRef.current = targetValue;
			setValue(targetValue);
			return;
		}
		let frame;
		let velocity = 0;
		let previous = performance.now();
		const update = (now) => {
			const seconds = Math.min((now - previous) / 1000, 0.064);
			previous = now;
			const displacement = targetValue - valueRef.current;
			velocity += (displacement * tension - velocity * friction) * seconds;
			valueRef.current += velocity * seconds;
			if (Math.abs(displacement) < 0.001 && Math.abs(velocity) < 0.001) {
				valueRef.current = targetValue;
				setValue(targetValue);
				return;
			}
			setValue(valueRef.current);
			frame = requestAnimationFrame(update);
		};
		frame = requestAnimationFrame(update);
		return () => cancelAnimationFrame(frame);
	}, [targetValue, tension, friction]);
	return value;
};

export default useSpring;
