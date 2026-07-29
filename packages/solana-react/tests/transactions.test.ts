import { describe, expect, it, vi } from 'vitest';
import { createTransactionExecutor, TransactionFailure } from '../src/transaction';

const base = { account: 'A', cluster: 'devnet', wallet: 'W', payload: {} };

describe('transaction seam', () => {
	it('signs, sends, and confirms only after explicit execution', async () => {
		const sign = vi.fn(async () => 'signed');
		const send = vi.fn(async () => 'signature');
		const confirm = vi.fn(async () => {});
		const execute = createTransactionExecutor({ getContext: () => base, sign, send, confirm });
		expect(sign).not.toHaveBeenCalled();
		await expect(execute()).resolves.toEqual({ status: 'confirmed', signature: 'signature' });
		expect(confirm).toHaveBeenCalledOnce();
	});

	it.each([
		[
			'signing-failed',
			{
				sign: async () => {
					throw new Error('reject');
				},
				send: async () => '',
				confirm: async () => {},
			},
		],
		[
			'sending-failed',
			{
				sign: async () => '',
				send: async () => {
					throw new Error('rpc');
				},
				confirm: async () => {},
			},
		],
		[
			'confirmation-failed',
			{
				sign: async () => '',
				send: async () => '',
				confirm: async () => {
					throw new Error('timeout');
				},
			},
		],
	] as const)('types %s errors without retrying', async (code, steps) => {
		const execute = createTransactionExecutor({ getContext: () => base, ...steps });
		await expect(execute()).rejects.toMatchObject({ code });
	});

	it('cancels a context change before dispatch and quarantines one after dispatch', async () => {
		let context = base;
		const signGate = Promise.withResolvers<string>();
		const execute = createTransactionExecutor({
			getContext: () => context,
			sign: () => signGate.promise,
			send: async () => 'signature',
			confirm: async () => {},
		});
		const pending = execute();
		await Promise.resolve();
		context = { ...base, cluster: 'mainnet' };
		signGate.resolve('signed');
		await expect(pending).resolves.toMatchObject({
			status: 'indeterminate',
			signature: 'signature',
		});

		const cancelled = createTransactionExecutor({
			getContext: () => context,
			sign: async () => '',
			send: async () => '',
			confirm: async () => {},
		});
		const cancellation = cancelled();
		context = { ...context, account: 'B' };
		await expect(cancellation).rejects.toEqual(
			expect.objectContaining<TransactionFailure>({ code: 'cancelled-before-dispatch' }),
		);
	});
});
