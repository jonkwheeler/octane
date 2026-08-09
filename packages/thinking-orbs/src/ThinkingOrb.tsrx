// Ported from thinking-orbs@0.2.0 src/ThinkingOrb.tsx
// (https://github.com/Jakubantalik/thinking-orbs).
import { useEffect, useRef } from 'octane';
import { MODE_DRAWS } from './engine/registry';
import { resolvePreset } from './presets';
import { useReducedMotion, useResolvedDark } from './theme';
import type { ThinkingOrbProps } from './types';

const LABELS: Record<string, string> = {
	working: 'Working…',
	searching: 'Searching…',
	solving: 'Solving…',
	listening: 'Listening…',
	connecting: 'Connecting…',
	weaving: 'Weaving…',
	composing: 'Composing…',
	breathing: 'Thinking…',
	shaping: 'Shaping…',
};

function assignConsumerRef(
	consumer: ThinkingOrbProps['ref'],
	node: HTMLCanvasElement | null,
): void {
	if (consumer == null) {
		return;
	}
	if (typeof consumer === 'function') {
		consumer(node);
		return;
	}
	if (Array.isArray(consumer)) {
		for (let i = 0; i < consumer.length; i++) {
			assignConsumerRef(consumer[i] as ThinkingOrbProps['ref'], node);
		}
		return;
	}
	(consumer as { current: HTMLCanvasElement | null }).current = node;
}

export function ThinkingOrb({
	state = 'working',
	size = 64,
	theme = 'auto',
	speed = 1,
	paused = false,
	style,
	'aria-label': ariaLabel,
	ref: consumerRef,
	...rest
}: ThinkingOrbProps) {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	// Stable identity so theme/reduced-motion updates do not detach the canvas.
	// Consumer refs are owned only by syncConsumerRef below (single attach/detach).
	const assignCanvasRef = useRef(function assignCanvasRef(node: HTMLCanvasElement | null): void {
		canvasRef.current = node;
	}).current;
	const dark = useResolvedDark(theme, canvasRef);
	const reduced = useReducedMotion();

	// Publish the consumer `ref` from effects so prop swaps clear the previous
	// holder without changing the stable canvas callback identity.
	useEffect(function syncConsumerRef() {
		const node = canvasRef.current;
		assignConsumerRef(consumerRef, node);
		return function cleanupConsumerRef() {
			assignConsumerRef(consumerRef, null);
		};
	}, [consumerRef]);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const dpr = Math.min(2, typeof devicePixelRatio !== 'undefined' && devicePixelRatio || 1);
		canvas.width = Math.round(size * dpr);
		canvas.height = Math.round(size * dpr);
		const maybeCtx = canvas.getContext('2d');
		if (!maybeCtx) return;
		const ctx: CanvasRenderingContext2D = maybeCtx;

		const { mode, speed: baseSpeed, opts } = resolvePreset(state, size);
		const draw = MODE_DRAWS[mode];
		const effSpeed = baseSpeed * speed;

		function frame(tSec: number): void {
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			ctx.clearRect(0, 0, size, size);
			draw(ctx, size, tSec, dark, opts);
		}

		if (reduced) {
			frame(0.6);
			return;
		}

		let raf = 0;
		let running = false;
		function loop(): void {
			frame((performance.now() / 1000) * effSpeed);
			if (running) raf = requestAnimationFrame(loop);
		}
		function start(): void {
			if (running || paused) return;
			running = true;
			raf = requestAnimationFrame(loop);
		}
		function stop(): void {
			running = false;
			cancelAnimationFrame(raf);
		}

		frame((performance.now() / 1000) * effSpeed);

		let visible = true;
		const io =
			typeof IntersectionObserver !== 'undefined'
				? new IntersectionObserver(([entry]) => {
						visible = entry.isIntersecting;
						if (visible && document.visibilityState !== 'hidden') start();
						else stop();
					})
				: null;
		io?.observe(canvas);
		function onVis(): void {
			if (document.visibilityState === 'hidden') stop();
			else if (visible) start();
		}
		document.addEventListener('visibilitychange', onVis);
		if (!io) start();

		return () => {
			stop();
			io?.disconnect();
			document.removeEventListener('visibilitychange', onVis);
		};
	}, [state, size, dark, speed, paused, reduced]);

	return <canvas
		ref={assignCanvasRef}
		role="img"
		aria-label={ariaLabel ?? LABELS[state]}
		style={{ width: size, height: size, display: 'block', ...style }}
		{...rest}
	/>;
}
