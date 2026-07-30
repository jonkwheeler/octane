import { createNormalizer } from '@zag-js/types';
import type { JSX } from 'octane/jsx-runtime';

type WithoutRef<T> = Omit<T, 'ref'>;

type ElementsWithoutRef = {
	[K in keyof JSX.IntrinsicElements]: WithoutRef<JSX.IntrinsicElements[K]>;
};

export type PropTypes = ElementsWithoutRef & {
	element: WithoutRef<JSX.IntrinsicElements['div']>;
	style: Exclude<JSX.IntrinsicElements['div']['style'], string | undefined>;
};

export const normalizeProps = createNormalizer<PropTypes>((value) => value);
