import { afterEach, describe, expect, it } from 'vitest';
import { mount } from '../../octane/tests/_helpers';
import { StateProbe } from './_fixtures/hooks.tsrx';

afterEach(() => document.body.replaceChildren());

describe('state hooks', () => {
	it('keeps omitted optional arguments and two call sites independent', () => {
		const result = mount(StateProbe);
		expect(result.find('#state').textContent).toBe('false/true/2/false/1/1');
		result.click('#first');
		expect(result.find('#state').textContent).toBe('true/true/2/false/1/1');
		result.click('#second');
		expect(result.find('#state').textContent).toBe('true/false/2/false/1/1');
		result.unmount();
	});

	it('matches the pinned counter, toggle, map, and step transitions', () => {
		const result = mount(StateProbe);
		result.click('#increment');
		result.click('#toggle');
		result.click('#map');
		result.click('#next');
		expect(result.find('#state').textContent).toBe('false/true/3/true/2/2');
		result.click('#reset');
		result.click('#remove');
		expect(result.find('#state').textContent).toBe('false/true/2/true/-/2');
		result.unmount();
	});
});
