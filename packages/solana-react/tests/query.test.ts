import { QueryClient } from '@octanejs/tanstack-query';
import { Query } from '@tanstack/query-core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, nextPaint } from '../../octane/tests/_helpers';
import { RequestApp } from './_fixtures/query.tsrx';

let client: QueryClient;

beforeEach(() => {
	client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});

async function flush() {
	for (let i = 0; i < 5; i++) {
		await new Promise((resolve) => setTimeout(resolve, 0));
		await nextPaint();
	}
}

describe('useRequestQuery', () => {
	it('passes the query AbortSignal to a function source', async () => {
		let receivedSignal: AbortSignal | undefined;
		const source = vi.fn(async (signal: AbortSignal) => {
			receivedSignal = signal;
			return 'function';
		});
		const result = mount(RequestApp, { client, source });

		await flush();

		expect(source).toHaveBeenCalledOnce();
		expect(receivedSignal).toBeInstanceOf(AbortSignal);
		expect(result.find('#status').textContent).toBe('data:function');
		result.unmount();
	});

	it('passes the query AbortSignal to an object source', async () => {
		const send = vi.fn(async ({ abortSignal }: { abortSignal?: AbortSignal } = {}) => {
			expect(abortSignal).toBeInstanceOf(AbortSignal);
			return 'object';
		});
		const result = mount(RequestApp, { client, source: { send } });

		await flush();

		expect(send).toHaveBeenCalledOnce();
		expect(result.find('#status').textContent).toBe('data:object');
		result.unmount();
	});

	it.each([
		['a null source', null, undefined],
		['enabled false', vi.fn(async () => 'disabled'), false],
	] as const)('does not dispatch for %s', async (_label, source, enabled) => {
		const result = mount(RequestApp, { client, source, enabled });

		await flush();

		if (source) expect(source).not.toHaveBeenCalled();
		expect(result.find('#status').textContent).toBe('pending');
		result.unmount();
	});

	it('preserves functional enabled semantics and supplies the TanStack Query', async () => {
		const disabledSource = vi.fn(async () => 'disabled');
		const disabledPredicate = vi.fn(() => false);
		const disabledResult = mount(RequestApp, {
			client,
			source: disabledSource,
			enabled: disabledPredicate,
		});

		await flush();

		expect(disabledPredicate).toHaveBeenCalled();
		expect(disabledPredicate.mock.calls[0]![0]).toBeInstanceOf(Query);
		expect(disabledSource).not.toHaveBeenCalled();
		disabledResult.unmount();

		const enabledSource = vi.fn(async () => 'enabled');
		const enabledPredicate = vi.fn(() => true);
		const enabledResult = mount(RequestApp, {
			client: new QueryClient({ defaultOptions: { queries: { retry: false } } }),
			source: enabledSource,
			enabled: enabledPredicate,
		});

		await flush();

		expect(enabledPredicate).toHaveBeenCalled();
		expect(enabledPredicate.mock.calls[0]![0]).toBeInstanceOf(Query);
		expect(enabledSource).toHaveBeenCalledOnce();
		expect(enabledResult.find('#status').textContent).toBe('data:enabled');
		enabledResult.unmount();
	});

	it('aborts an in-flight function source when its last observer unmounts', async () => {
		let signal: AbortSignal | undefined;
		const source = vi.fn(
			(receivedSignal: AbortSignal) =>
				new Promise<string>(() => {
					signal = receivedSignal;
				}),
		);
		const result = mount(RequestApp, { client, source });
		await flush();
		expect(signal?.aborted).toBe(false);

		result.unmount();
		await flush();

		expect(signal?.aborted).toBe(true);
	});
});
