export type TransactionContext<TPayload> = Readonly<{
	account: string;
	cluster: string;
	wallet: string;
	payload: TPayload;
}>;
export type TransactionFailureCode =
	| 'cancelled-before-dispatch'
	| 'missing-capability'
	| 'signing-failed'
	| 'sending-failed'
	| 'confirmation-failed'
	| 'indeterminate';
export class TransactionFailure extends Error {
	constructor(
		public readonly code: TransactionFailureCode,
		message: string,
		public readonly cause?: unknown,
	) {
		super(message);
		this.name = 'TransactionFailure';
	}
}
export type TransactionResult<TSignature> =
	| { status: 'confirmed'; signature: TSignature }
	| {
			status: 'indeterminate';
			signature?: TSignature;
			reconcile(): Promise<TransactionResult<TSignature>>;
	  };

export function createTransactionExecutor<TPayload, TSigned, TSignature>(options: {
	getContext(): TransactionContext<TPayload>;
	sign?(context: TransactionContext<TPayload>): Promise<TSigned>;
	send?(signed: TSigned, context: TransactionContext<TPayload>): Promise<TSignature>;
	confirm?(signature: TSignature, context: TransactionContext<TPayload>): Promise<void>;
}) {
	let active = 0;
	const same = (a: TransactionContext<TPayload>, b: TransactionContext<TPayload>) =>
		a.account === b.account &&
		a.cluster === b.cluster &&
		a.wallet === b.wallet &&
		Object.is(a.payload, b.payload);

	return async function execute(): Promise<TransactionResult<TSignature>> {
		const operation = ++active;
		const context = options.getContext();
		if (!options.sign || !options.send || !options.confirm)
			throw new TransactionFailure(
				'missing-capability',
				'Wallet lacks sign/send/confirm capability',
			);
		await Promise.resolve();
		if (operation !== active || !same(context, options.getContext()))
			throw new TransactionFailure(
				'cancelled-before-dispatch',
				'Transaction context changed before wallet dispatch',
			);
		let signed: TSigned;
		try {
			signed = await options.sign(context);
		} catch (cause) {
			throw new TransactionFailure('signing-failed', 'Wallet rejected or failed signing', cause);
		}
		let signature: TSignature;
		try {
			signature = await options.send(signed, context);
		} catch (cause) {
			throw new TransactionFailure('sending-failed', 'Transaction submission failed', cause);
		}
		if (!same(context, options.getContext())) {
			return { status: 'indeterminate', signature, reconcile: () => reconcile(signature, context) };
		}
		return reconcile(signature, context);
	};

	async function reconcile(
		signature: TSignature,
		context: TransactionContext<TPayload>,
	): Promise<TransactionResult<TSignature>> {
		try {
			await options.confirm!(signature, context);
		} catch (cause) {
			throw new TransactionFailure('confirmation-failed', 'Transaction confirmation failed', cause);
		}
		return { status: 'confirmed', signature };
	}
}
