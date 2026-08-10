import { describe, expect, it } from 'vitest';
import { render } from '../src/index.ts';
import { WelcomeEmail } from './_fixtures/email.tsrx';

describe('@octanejs/react-email', () => {
	it('renders an email-safe static document through the public API', async () => {
		const html = await render(WelcomeEmail, { name: 'Ada' });
		expect(html.startsWith('<!DOCTYPE html PUBLIC')).toBe(true);
		expect(html).toContain('<html dir="ltr" lang="en"><head>');
		expect(html).toContain('content="text/html; charset=UTF-8"');
		expect(html).toContain('Hello, Ada');
		expect(html).toContain('role="presentation"');
		expect(html).toContain('background-color:#000');
		expect(html).not.toContain('data-octane');
	});

	it('supports readable output without changing document content', async () => {
		const html = await render(WelcomeEmail, { name: 'Grace' }, { pretty: true });
		expect(html).toContain('>\n<');
		expect(html).toContain('Hello, Grace');
	});
});
