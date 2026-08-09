// Exact executable evidence for the documented ref-as-prop adaptation.
import { describe, expect, it } from 'vitest';
import { createElement } from 'octane';

import styled from '@octanejs/styled-components';
import { mount } from '../_helpers';

describe('transient props and shouldForwardProp', () => {
	// @parity-case adapted:styled-components-ref-prop
	it('always attaches ref even when shouldForwardProp rejects it', () => {
		let attached: Element | null = null;
		const Filtered = styled.div.withConfig({
			shouldForwardProp: (prop) => prop !== 'ref',
		})``;
		const m = mount(() =>
			createElement(Filtered as any, {
				id: 'ref-target',
				ref: (element: Element | null) => {
					attached = element;
				},
			}),
		);
		expect(attached).toBe(m.find('#ref-target'));
		m.unmount();
	});
});
