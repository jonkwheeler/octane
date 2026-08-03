import { beforeAll, describe, expect, it } from 'vitest';
import { flushEffects, mount } from '../../../octane/tests/_helpers';
import TextareaAutosize from '../../src/index.tsrx';

beforeAll(() => {
	Object.defineProperty(document, 'fonts', {
		configurable: true,
		value: { addEventListener() {}, removeEventListener() {} },
	});
});

describe('<TextareaAutosize /> adapted upstream inventory', () => {
	it('renders ok', () => {
		const app = mount(TextareaAutosize);
		flushEffects();

		expect(app.html()).toBe('<textarea></textarea>');
		app.unmount();
	});

	it('renders with initial height passed in style prop', () => {
		const app = mount(TextareaAutosize, { style: { height: 55 } });
		flushEffects();

		expect((app.find('textarea') as HTMLTextAreaElement).style.height).toBe('55px');
		app.unmount();
	});
});
