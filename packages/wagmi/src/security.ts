import type { State } from '@wagmi/core';
import { getConnection, type Config } from '@wagmi/core';

export const HYDRATION_VERSION = 1;
export const MAX_HYDRATION_BYTES = 16_384;

export class LiveConnectionRequiredError extends Error {
	override name = 'LiveConnectionRequiredError';
	constructor() {
		super('A current live connector is required for this privileged action.');
	}
}

export class ActionContextChangedError extends Error {
	override name = 'ActionContextChangedError';
	readonly phase: 'before-dispatch' | 'after-dispatch';
	readonly quarantinedResult?: unknown;
	constructor(phase: 'before-dispatch' | 'after-dispatch', quarantinedResult?: unknown) {
		super(
			phase === 'before-dispatch'
				? 'Wallet context changed before dispatch; the action was cancelled.'
				: 'Wallet context changed after dispatch; the result is indeterminate and quarantined.',
		);
		this.phase = phase;
		this.quarantinedResult = quarantinedResult;
	}
}

function actionContext(config: Config) {
	const connection = getConnection(config);
	return {
		address: connection.address,
		chainId: connection.chainId,
		connector: connection.connector?.uid,
		status: connection.status,
	};
}

function sameContext(a: ReturnType<typeof actionContext>, b: ReturnType<typeof actionContext>) {
	return (
		a.address === b.address &&
		a.chainId === b.chainId &&
		a.connector === b.connector &&
		a.status === b.status
	);
}

/**
 * Hardens a Wagmi mutation option object without retrying wallet prompts.
 * Late success is deliberately converted to a typed quarantined error.
 */
export function secureMutationOptions(
	config: Config,
	options: Record<string, any>,
	displayed = actionContext(config),
) {
	const mutationFn = options.mutationFn;
	if (typeof mutationFn !== 'function') return { ...options, retry: false };
	return {
		...options,
		retry: false,
		async mutationFn(variables: unknown) {
			const before = actionContext(config);
			if (before.status !== 'connected' || !before.connector)
				throw new LiveConnectionRequiredError();
			if (!sameContext(displayed, before)) throw new ActionContextChangedError('before-dispatch');
			const result = await mutationFn(variables);
			if (!sameContext(before, actionContext(config)))
				throw new ActionContextChangedError('after-dispatch', result);
			return result;
		},
	};
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isSafeState(value: unknown): value is State {
	if (!isRecord(value)) return false;
	if (!['connected', 'connecting', 'disconnected', 'reconnecting'].includes(String(value.status)))
		return false;
	if (!Array.isArray(value.connections) && !(value.connections instanceof Map)) return false;
	if (typeof value.chainId !== 'number' || !Number.isSafeInteger(value.chainId)) return false;
	return true;
}

/** Parse an untrusted SSR/cookie hint. Connector and provider objects are never accepted. */
export function parseHydratedState(input: string): State | undefined {
	if (new TextEncoder().encode(input).byteLength > MAX_HYDRATION_BYTES) return undefined;
	try {
		const envelope: unknown = JSON.parse(input);
		if (!isRecord(envelope) || envelope.version !== HYDRATION_VERSION) return undefined;
		if (!isSafeState(envelope.state)) return undefined;
		const state = envelope.state as unknown as Record<string, unknown>;
		if ('connector' in state || 'provider' in state || 'signature' in state || 'token' in state)
			return undefined;
		return {
			...(envelope.state as State),
			// Untrusted JSON cannot carry live connector instances. Connections are
			// deliberately rebuilt by Wagmi reconnect rather than trusted here.
			connections: new Map(),
			current: null,
			status: 'disconnected',
		};
	} catch {
		return undefined;
	}
}

export function serializeHydratedState(state: State): string | undefined {
	const connections = state.connections instanceof Map ? [] : state.connections;
	const safe = {
		version: HYDRATION_VERSION,
		state: { chainId: state.chainId, connections, current: state.current, status: state.status },
	};
	const value = JSON.stringify(safe);
	return new TextEncoder().encode(value).byteLength <= MAX_HYDRATION_BYTES ? value : undefined;
}
