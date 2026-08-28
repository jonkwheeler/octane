import { describe, expect, it } from 'vitest';
import * as binding from '../../src/index';
describe('react-responsive-carousel public entry', () => {
	it('exports a non-empty surface', () => expect(Object.keys(binding).length).toBeGreaterThan(0));
});
