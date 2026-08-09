import { describe, expect, it, vi } from 'vitest';
import { compileFixture } from './fixture-compiler';

function dependencies(compile: (source: string, path: string) => any) {
	return {
		readFile: vi.fn(() => 'fixture') as any,
		compile: vi.fn(compile) as any,
		transform: vi.fn(() => ({ code: 'compiled' })) as any,
		writeFile: vi.fn() as any,
	};
}

describe('TanStack Virtual differential setup', () => {
	// @parity-case differential:tanstack-virtual-setup-compile-errors
	it('fails closed when TSRX compilation reports errors', () => {
		const deps = dependencies(() => ({ code: '', errors: [{ message: 'invalid' }] }));
		expect(() => compileFixture('/fixture/broken.tsrx', '/cache', deps)).toThrow(/invalid/);
		expect(deps.writeFile).not.toHaveBeenCalled();
	});

	// @parity-case differential:tanstack-virtual-setup-transform-exceptions
	it('propagates transform exceptions without writing cache output', () => {
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
