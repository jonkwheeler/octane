// Adapted side: @octanejs/motion public surface compiled with tsc.
import {
	AnimatePresence,
	MotionConfig,
	motion,
	useAnimate,
	useMotionValue,
	useSpring,
	useTransform,
} from '@octanejs/motion';

void motion.div;
void AnimatePresence;
void MotionConfig;

const x = useMotionValue(0);
void x.get;
void useTransform(x, function map(value: number) {
	return value * 2;
});
void useSpring(x);
void useAnimate;
