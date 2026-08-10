import type { OctaneNode } from 'octane';
import type { Octane } from 'octane/jsx-runtime';

export type EmailStyle = Exclude<
	Octane.HTMLAttributes<HTMLElement>['style'],
	string | undefined
> & {
	msoPaddingAlt?: string | number;
	msoTextRaise?: string | number;
};

export type EmailElementProps<Element extends HTMLElement = HTMLElement> = Readonly<{
	children?: OctaneNode;
	style?: EmailStyle;
	ref?: ((element: Element | null) => void) | { current: Element | null } | null;
	[key: string]: unknown;
}>;
