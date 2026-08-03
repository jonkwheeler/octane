import { describe, expect, it, vi } from 'vitest';
import { mount } from './_helpers.js';
import { DescriptorChildrenApp, descriptorIsElement } from './_fixtures/descriptor-children.tsrx';

describe('descriptorChildren', () => {
	it('lets a component inspect and clone one ordinary template child without a wrapper', () => {
		const inspect = vi.fn();
		const onClick = vi.fn();
		const ref = { current: null as HTMLButtonElement | null };
		const mounted = mount(DescriptorChildrenApp, { inspect, onClick, ref });

		expect(inspect).toHaveBeenCalledTimes(1);
		expect(descriptorIsElement(inspect.mock.calls[0][0])).toBe(true);
		expect(mounted.findAll('button')).toHaveLength(1);
		expect(mounted.html()).toContain('class="original cloned"');
		expect(ref.current).toBe(mounted.find('button'));
		mounted.click('button');
		expect(onClick).toHaveBeenCalledTimes(1);
		mounted.unmount();
	});
});
