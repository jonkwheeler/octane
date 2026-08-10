import { renderToStaticMarkup } from 'octane/server';
import { renderWithTailwind } from './tailwind/index.ts';

export interface RenderOptions {
	pretty?: boolean;
}

export type EmailComponent<Props> = (props: Props) => unknown;

const DOCTYPE =
	'<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">';

/** Render an Octane email component to non-hydratable email HTML. */
export async function render<Props>(
	component: EmailComponent<Props>,
	props?: Props,
	options?: RenderOptions,
): Promise<string> {
	return renderWithTailwind(() => {
		const { html, css } = renderToStaticMarkup(component, props);
		const cleanHtml = html.replace(/<!DOCTYPE.*?>/i, '');
		const htmlStart = cleanHtml.indexOf('<html');
		let documentHtml = cleanHtml;
		if (htmlStart > 0) {
			const hoistedHead = cleanHtml.slice(0, htmlStart);
			const root = cleanHtml.slice(htmlStart);
			const openingEnd = root.indexOf('>') + 1;
			documentHtml = `${root.slice(0, openingEnd)}<head>${hoistedHead}${css}</head>${root.slice(openingEnd)}`;
		} else if (css.length > 0) {
			documentHtml = cleanHtml.replace('<head>', `<head>${css}`);
		}
		const document = `${DOCTYPE}${documentHtml}`;
		return options?.pretty ? formatEmailHtml(document) : document;
	});
}

export function formatEmailHtml(html: string): string {
	return html.replace(/></g, '>\n<');
}
