import { useCallback, useContext, useEffect, useRef, useSyncExternalStore } from 'octane';
import {
	getChainId,
	getChains,
	getConnection,
	getConnections,
	getConnectors,
	watchChainId,
	watchConnection,
	watchConnections,
	watchConnectors,
	type Config,
	type ConnectErrorType,
	type GetBalanceErrorType,
	type ResolvedRegister,
	type SignMessageErrorType,
} from '@wagmi/core';
import { deepEqual, watchChains } from '@wagmi/core/internal';
import {
	connectMutationOptions,
	disconnectMutationOptions,
	getBalanceQueryOptions,
	readContractQueryOptions,
	sendTransactionMutationOptions,
	signMessageMutationOptions,
	simulateContractQueryOptions,
	switchChainMutationOptions,
	switchConnectionMutationOptions,
	waitForTransactionReceiptQueryOptions,
	writeContractMutationOptions,
	type ConnectData,
	type ConnectMutate,
	type ConnectMutateAsync,
	type ConnectOptions,
	type ConnectVariables,
	type GetBalanceData,
	type GetBalanceOptions,
	type SignMessageData,
	type SignMessageMutate,
	type SignMessageMutateAsync,
	type SignMessageOptions,
	type SignMessageVariables,
} from '@wagmi/core/query';
import {
	useMutation,
	useQuery,
	type UseMutationOptions,
	type UseMutationResult,
	type UseQueryOptions,
	type UseQueryResult,
} from '@octanejs/tanstack-query';
import { WagmiContext, subSlot } from './internal';
import { secureMutationOptions } from './security';

type ParametersWithConfig<config extends Config = Config> = {
	config?: config;
	[key: string]: unknown;
};

const useMutationWithSlot = useMutation as unknown as <data, error, variables, context>(
	options: UseMutationOptions<data, error, variables, context>,
	queryClient: undefined,
	slot: symbol | undefined,
) => UseMutationResult<data, error, variables, context>;

const useQueryWithSlot = useQuery as unknown as <queryData, error, data>(
	options: UseQueryOptions<queryData, error, data>,
	queryClient: undefined,
	slot: symbol | undefined,
) => UseQueryResult<data, error>;

function useOctaneMutation<data, error, variables, context>(
	options: UseMutationOptions<data, error, variables, context>,
	slot: symbol | undefined,
): UseMutationResult<data, error, variables, context> {
	return useMutationWithSlot(options, undefined, slot);
}

function useOctaneQuery<queryData, error, data>(
	options: UseQueryOptions<queryData, error, data>,
	slot: symbol | undefined,
): UseQueryResult<data, error> {
	return useQueryWithSlot(options, undefined, slot);
}

function argumentsAndSlot(
	parameters: ParametersWithConfig | symbol | undefined,
	rest: unknown[],
): [ParametersWithConfig, symbol | undefined] {
	if (typeof parameters === 'symbol') return [{}, parameters];
	const tail = rest.at(-1);
	return [parameters ?? {}, typeof tail === 'symbol' ? tail : undefined];
}

export class WagmiProviderNotFoundError extends Error {
	override name = 'WagmiProviderNotFoundError';
	constructor() {
		super('`useConfig` must be used within `WagmiProvider` or receive a `config` option.');
	}
}

export function useConfig<config extends Config = ResolvedRegister['config']>(
	parameters: { config?: config } | symbol = {},
): config {
	const direct = typeof parameters === 'symbol' ? undefined : parameters.config;
	const context = useContext(WagmiContext);
	const config = direct ?? context;
	if (!config) throw new WagmiProviderNotFoundError();
	return config as config;
}

function useSnapshot<T>(
	subscribe: (onChange: () => void) => () => void,
	getSnapshot: () => T,
	slot: symbol | undefined,
): T {
	const cached = useRef<T | undefined>(undefined, subSlot(slot, 'cache'));
	const stableSnapshot = () => {
		const next = getSnapshot();
		if (cached.current !== undefined && deepEqual(cached.current, next)) return cached.current;
		cached.current = next;
		return next;
	};
	return useSyncExternalStore(
		subscribe,
		stableSnapshot,
		stableSnapshot,
		subSlot(slot, 'external-store'),
	);
}

export function useConnection<config extends Config = ResolvedRegister['config']>(
	parameters: ParametersWithConfig<config> | symbol = {},
	...rest: unknown[]
) {
	const [options, slot] = argumentsAndSlot(parameters, rest);
	const config = useConfig(options);
	const subscribe = useCallback(
		(onChange: () => void) => watchConnection(config, { onChange }),
		[config],
		subSlot(slot, 'subscribe'),
	);
	return useSnapshot(subscribe, () => getConnection(config), slot);
}

export function useChainId<config extends Config = ResolvedRegister['config']>(
	parameters: ParametersWithConfig<config> | symbol = {},
	...rest: unknown[]
) {
	const [options, slot] = argumentsAndSlot(parameters, rest);
	const config = useConfig(options);
	const subscribe = useCallback(
		(onChange: () => void) => watchChainId(config, { onChange }),
		[config],
		subSlot(slot, 'subscribe'),
	);
	return useSnapshot(subscribe, () => getChainId(config), slot);
}

export function useChains<config extends Config = ResolvedRegister['config']>(
	parameters: ParametersWithConfig<config> | symbol = {},
	...rest: unknown[]
) {
	const [options, slot] = argumentsAndSlot(parameters, rest);
	const config = useConfig(options);
	const subscribe = useCallback(
		(onChange: () => void) => watchChains(config, { onChange }),
		[config],
		subSlot(slot, 'subscribe'),
	);
	return useSnapshot(subscribe, () => getChains(config), slot);
}

export function useConnectors<config extends Config = ResolvedRegister['config']>(
	parameters: ParametersWithConfig<config> | symbol = {},
	...rest: unknown[]
) {
	const [options, slot] = argumentsAndSlot(parameters, rest);
	const config = useConfig(options);
	const subscribe = useCallback(
		(onChange: () => void) => watchConnectors(config, { onChange }),
		[config],
		subSlot(slot, 'subscribe'),
	);
	return useSnapshot(subscribe, () => getConnectors(config), slot);
}

export function useConnections(parameters: ParametersWithConfig | symbol = {}, ...rest: unknown[]) {
	const [options, slot] = argumentsAndSlot(parameters, rest);
	const config = useConfig(options);
	const subscribe = useCallback(
		(onChange: () => void) => watchConnections(config, { onChange }),
		[config],
		subSlot(slot, 'subscribe'),
	);
	return useSnapshot(subscribe, () => getConnections(config), slot);
}

function useMutationWithAliases(
	factory: unknown,
	parameters: ParametersWithConfig | symbol | undefined,
	rest: unknown[],
	aliases: string[],
	privileged = false,
	securityAction: 'privileged' | 'switchChain' | 'switchConnection' = 'privileged',
) {
	const [options, slot] = argumentsAndSlot(parameters, rest);
	const config = useConfig(options);
	const mutationOptions = (
		factory as (
			config: Config,
			parameters: ParametersWithConfig,
		) => UseMutationOptions<unknown, unknown, unknown, unknown>
	)(config, options);
	const mutation = useOctaneMutation(
		privileged
			? secureMutationOptions(config, mutationOptions, undefined, securityAction)
			: mutationOptions,
		subSlot(slot, 'mutation'),
	);
	const result: Record<string, unknown> & typeof mutation = { ...mutation };
	for (const alias of aliases) {
		result[alias] = alias.endsWith('Async') ? mutation.mutateAsync : mutation.mutate;
	}
	return result;
}

export type UseConnectParameters<
	config extends Config = Config,
	context = unknown,
> = ConnectOptions<config, context> & { config?: config };

export type UseConnectReturnType<config extends Config = Config, context = unknown> = Omit<
	UseMutationResult<
		ConnectData<config, config['connectors'][number], boolean>,
		ConnectErrorType,
		ConnectVariables<config, config['connectors'][number], boolean>,
		context
	>,
	'mutate' | 'mutateAsync'
> & {
	mutate: ConnectMutate<config, context>;
	mutateAsync: ConnectMutateAsync<config, context>;
	connect: ConnectMutate<config, context>;
	connectAsync: ConnectMutateAsync<config, context>;
	connectors: config['connectors'];
};

export function useConnect<config extends Config = ResolvedRegister['config'], context = unknown>(
	parameters?: UseConnectParameters<config, context> | symbol,
	...rest: unknown[]
): UseConnectReturnType<config, context>;
export function useConnect(parameters: ParametersWithConfig | symbol = {}, ...rest: unknown[]) {
	const [options, slot] = argumentsAndSlot(parameters, rest);
	const config = useConfig(options);
	const mutationOptions = connectMutationOptions(
		config,
		options as UseConnectParameters<typeof config>,
	);
	const mutation = useOctaneMutation(
		{ ...mutationOptions, retry: false },
		subSlot(slot, 'mutation'),
	);
	useEffect(
		() =>
			config.subscribe(
				({ status }) => status,
				(status, previous) => {
					if (previous === 'connected' && status === 'disconnected') mutation.reset();
				},
			),
		[config, mutation.reset],
		subSlot(slot, 'reset'),
	);
	return {
		...mutation,
		connect: mutation.mutate,
		connectAsync: mutation.mutateAsync,
		connectors: useConnectors({ config }, subSlot(slot, 'connectors')),
	} as UseConnectReturnType<typeof config>;
}

export function useDisconnect(parameters: ParametersWithConfig | symbol = {}, ...rest: unknown[]) {
	const result = useMutationWithAliases(disconnectMutationOptions, parameters, rest, [
		'disconnect',
		'disconnectAsync',
	]);
	const [options, slot] = argumentsAndSlot(parameters, rest);
	const config = useConfig(options);
	return {
		...result,
		connectors: useConnections({ config }, subSlot(slot, 'connections')).map(
			(connection) => connection.connector,
		),
	};
}

export function useSwitchConnection(
	parameters: ParametersWithConfig | symbol = {},
	...rest: unknown[]
) {
	const result = useMutationWithAliases(
		switchConnectionMutationOptions,
		parameters,
		rest,
		['switchConnection', 'switchConnectionAsync'],
		true,
		'switchConnection',
	);
	const [options, slot] = argumentsAndSlot(parameters, rest);
	const config = useConfig(options);
	return {
		...result,
		connectors: useConnections({ config }, subSlot(slot, 'connections')).map(
			(connection) => connection.connector,
		),
	};
}

export function useSwitchChain(parameters: ParametersWithConfig | symbol = {}, ...rest: unknown[]) {
	const result = useMutationWithAliases(
		switchChainMutationOptions,
		parameters,
		rest,
		['switchChain', 'switchChainAsync'],
		true,
		'switchChain',
	);
	const [options, slot] = argumentsAndSlot(parameters, rest);
	const config = useConfig(options);
	return { ...result, chains: useChains({ config }, subSlot(slot, 'chains')) };
}

function useCoreQuery(
	factory: unknown,
	parameters: ParametersWithConfig | symbol | undefined,
	rest: unknown[],
	options: { account?: boolean; chain?: boolean } = {},
) {
	const [input, slot] = argumentsAndSlot(parameters, rest);
	const config = useConfig(input);
	const chainId = useChainId({ config }, subSlot(slot, 'chain'));
	const connection = options.account
		? useConnection({ config }, subSlot(slot, 'connection'))
		: undefined;
	const queryOptions = (
		factory as (
			config: Config,
			parameters: ParametersWithConfig,
		) => UseQueryOptions<unknown, unknown, unknown>
	)(config, {
		...input,
		...(options.account
			? {
					account: input.account ?? connection?.address,
					connector: input.connector ?? connection?.connector,
				}
			: {}),
		...(options.chain ? { chainId: input.chainId ?? chainId } : {}),
	});
	return useOctaneQuery(queryOptions, subSlot(slot, 'query'));
}

export type UseBalanceParameters<
	config extends Config = Config,
	selectData = GetBalanceData,
> = GetBalanceOptions<config, selectData> & { config?: config };
export type UseBalanceReturnType<selectData = GetBalanceData> = UseQueryResult<
	selectData,
	GetBalanceErrorType
>;

export function useBalance<
	config extends Config = ResolvedRegister['config'],
	selectData = GetBalanceData,
>(
	parameters?: UseBalanceParameters<config, selectData> | symbol,
	...rest: unknown[]
): UseBalanceReturnType<selectData>;
export function useBalance(parameters: ParametersWithConfig | symbol = {}, ...rest: unknown[]) {
	return useCoreQuery(getBalanceQueryOptions, parameters, rest, { chain: true });
}

export function useReadContract(
	parameters: ParametersWithConfig | symbol = {},
	...rest: unknown[]
) {
	return useCoreQuery(readContractQueryOptions, parameters, rest, { chain: true });
}

export function useSimulateContract(
	parameters: ParametersWithConfig | symbol = {},
	...rest: unknown[]
) {
	return useCoreQuery(simulateContractQueryOptions, parameters, rest, {
		account: true,
		chain: true,
	});
}

export function useWaitForTransactionReceipt(
	parameters: ParametersWithConfig | symbol = {},
	...rest: unknown[]
) {
	return useCoreQuery(waitForTransactionReceiptQueryOptions, parameters, rest, { chain: true });
}

export function useWriteContract(
	parameters: ParametersWithConfig | symbol = {},
	...rest: unknown[]
) {
	return useMutationWithAliases(
		writeContractMutationOptions,
		parameters,
		rest,
		['writeContract', 'writeContractAsync'],
		true,
	);
}

export function useSendTransaction(
	parameters: ParametersWithConfig | symbol = {},
	...rest: unknown[]
) {
	return useMutationWithAliases(
		sendTransactionMutationOptions,
		parameters,
		rest,
		['sendTransaction', 'sendTransactionAsync'],
		true,
	);
}

export type UseSignMessageParameters<context = unknown> = SignMessageOptions<context> & {
	config?: Config;
};
export type UseSignMessageReturnType<context = unknown> = Omit<
	UseMutationResult<SignMessageData, SignMessageErrorType, SignMessageVariables, context>,
	'mutate' | 'mutateAsync'
> & {
	mutate: SignMessageMutate<context>;
	mutateAsync: SignMessageMutateAsync<context>;
	signMessage: SignMessageMutate<context>;
	signMessageAsync: SignMessageMutateAsync<context>;
};

export function useSignMessage<context = unknown>(
	parameters: UseSignMessageParameters<context> | symbol = {},
	...rest: unknown[]
): UseSignMessageReturnType<context> {
	return useMutationWithAliases(
		signMessageMutationOptions,
		parameters as ParametersWithConfig | symbol,
		rest,
		['signMessage', 'signMessageAsync'],
		true,
	) as unknown as UseSignMessageReturnType<context>;
}
