// Pristine side: published motion/react@12.42.2 typings, compiled with plain tsc.
import {
	AnimatePresence,
	MotionConfig,
	motion,
	useAnimate,
	useMotionValue,
	useSpring,
	useTransform,
} from 'motion/react';

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
