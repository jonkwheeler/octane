import type { CSSObjectWithLabel } from './types';

export function resolveComponentStyle(
	cssValue: CSSObjectWithLabel,
	className?: unknown,
): { className: string; id: string };

export interface KeyframesValue {
	name: string;
	styles: string;
	anim: 1;
	toString(): string;
}

export function createKeyframes(cssValue: CSSObjectWithLabel): KeyframesValue;
