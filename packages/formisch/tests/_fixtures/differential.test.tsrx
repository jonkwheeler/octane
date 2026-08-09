import { render, waitFor } from '@octanejs/testing-library';
import { useField, useForm } from '@formisch/react';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import * as v from 'valibot';
import { afterEach, describe, expect, it } from 'vitest';
import { OctaneDifferentialForm } from './differential.tsrx';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const schema = v.object({
	email: v.pipe(v.string(), v.email('invalid')),
});

function ReactDifferentialForm() {
	const form = useForm({
		schema,
		initialInput: { email: '' },
		validate: 'input',
	});
	const field = useField(form, { path: ['email'] });
	return createElement(
		'div',
		null,
		createElement('output', { 'data-value': true }, field.input),
		createElement('output', { 'data-error': true }, field.errors?.[0] ?? ''),
		createElement(
			'button',
			{ type: 'button', onClick: () => field.onChange('valid@example.com') },
			'Set valid',
		),
	);
}

function snapshot(container: HTMLElement) {
	return {
		value: container.querySelector('[data-value]')?.textContent,
		error: container.querySelector('[data-error]')?.textContent,
	};
}

let reactContainer: HTMLDivElement | undefined;

afterEach(() => {
	reactContainer?.remove();
	reactContainer = undefined;
});

describe('Formisch differential parity', () => {
	// @parity-case differential:field-update
	it('matches the real React adapter across a programmatic field update', async () => {
		const octane = render(<OctaneDifferentialForm />);
		reactContainer = document.createElement('div');
		document.body.appendChild(reactContainer);
		const reactRoot = createRoot(reactContainer);

		await act(async () => {
			reactRoot.render(createElement(ReactDifferentialForm));
		});
		expect(snapshot(octane.container)).toEqual(snapshot(reactContainer));

		await act(async () => {
			(reactContainer?.querySelector('button') as HTMLButtonElement).click();
		});
		(octane.container.querySelector('button') as HTMLButtonElement).click();

		await waitFor(
			() => expect(snapshot(octane.container)).toEqual({
				value: 'valid@example.com',
				error: '',
			}),
		);
		expect(snapshot(octane.container)).toEqual(snapshot(reactContainer));

		await act(async () => reactRoot.unmount());
	});
});
