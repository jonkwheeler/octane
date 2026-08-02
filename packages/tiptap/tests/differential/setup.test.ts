import { describe, expect, it, vi } from 'vitest';
import { compileFixture } from './fixture-compiler';

const dependencies = (compile: (source: string, path: string) => any) => ({
	readFile: vi.fn(() => 'fixture') as any,
	compile: vi.fn(compile) as any,
	transform: vi.fn(() => ({ code: 'compiled' })) as any,
	writeFile: vi.fn() as any,
});

describe('Tiptap differential setup', () => {
	it('fails closed on compiler errors', () => {
		const deps = dependencies(() => ({ code: '', errors: [{ message: 'invalid' }] }));
		expect(() => compileFixture('/fixture/broken.tsrx', '/cache', deps)).toThrow(/invalid/);
		expect(deps.writeFile).not.toHaveBeenCalled();
	});
	it('propagates transform exceptions without cache output', () => {
		const deps = dependencies(() => ({ code: 'compiled' }));
		deps.transform.mockImplementation(() => {
			throw new Error('transform exploded');
		});
		expect(() => compileFixture('/fixture/broken.tsrx', '/cache', deps)).toThrow(
			'transform exploded',
		);
		expect(deps.writeFile).not.toHaveBeenCalled();
	});
});
