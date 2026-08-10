import type { EmailStyle } from './types.ts';

type Space = string | number | undefined;

export function splitPadding(style: EmailStyle = {}): [EmailStyle, EmailStyle] {
	const cell: EmailStyle = {};
	const outer: EmailStyle = {};
	for (const key in style) {
		if (!Object.hasOwn(style, key)) continue;
		const target =
			key === 'padding' ||
			key === 'paddingTop' ||
			key === 'paddingRight' ||
			key === 'paddingBottom' ||
			key === 'paddingLeft'
				? cell
				: outer;
		(target as Record<string, unknown>)[key] = (style as Record<string, unknown>)[key];
	}
	return [cell, outer];
}

function expandSpace(value: Space): [Space, Space, Space, Space] {
	if (typeof value === 'number') return [value, value, value, value];
	if (typeof value !== 'string') return [undefined, undefined, undefined, undefined];
	const values = value.trim().split(/\s+/);
	if (values.length === 1) return [values[0], values[0], values[0], values[0]];
	if (values.length === 2) return [values[0], values[1], values[0], values[1]];
	if (values.length === 3) return [values[0], values[1], values[2], values[1]];
	return [values[0], values[1], values[2], values[3]];
}

export function computeMargins(style: EmailStyle): EmailStyle {
	let [top, right, bottom, left] = expandSpace(style.margin as Space);
	if (style.marginTop !== undefined) top = style.marginTop as Space;
	if (style.marginRight !== undefined) right = style.marginRight as Space;
	if (style.marginBottom !== undefined) bottom = style.marginBottom as Space;
	if (style.marginLeft !== undefined) left = style.marginLeft as Space;
	return { marginTop: top, marginRight: right, marginBottom: bottom, marginLeft: left };
}

export function withMargins(props: Record<string, Space>): EmailStyle {
	const result: EmailStyle = {};
	const put = (value: Space, names: string[]) => {
		if (value === undefined || Number.isNaN(Number.parseFloat(String(value)))) return;
		for (const name of names) (result as Record<string, unknown>)[name] = `${value}px`;
	};
	put(props.m, ['margin']);
	put(props.mx, ['marginLeft', 'marginRight']);
	put(props.my, ['marginTop', 'marginBottom']);
	put(props.mt, ['marginTop']);
	put(props.mr, ['marginRight']);
	put(props.mb, ['marginBottom']);
	put(props.ml, ['marginLeft']);
	return result;
}
