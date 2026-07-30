import { createNormalizer } from '@zag-js/types';
import type { JSX } from 'octane/jsx-runtime';

export type PropTypes = JSX.IntrinsicElements & {
	element: JSX.IntrinsicElements['div'];
	style: Exclude<JSX.IntrinsicElements['div']['style'], string | undefined>;
};

export const normalizeProps = createNormalizer<PropTypes>((value) => {
	const props = value as Record<string, unknown>;
	if (typeof props.onChange !== 'function' || props.onInput !== undefined) return value;
	const { onChange, ...rest } = props;
	return { ...rest, onInput: onChange } as typeof value;
});
