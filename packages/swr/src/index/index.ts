export default function useSWR(): never {
	throw new Error('@octanejs/swr U1 architecture scaffold: implementation begins in U2');
}
export const SWRConfig = { __u1: true };
export const unstable_serialize = (value: unknown) => JSON.stringify(value);
export const useSWRConfig = () => ({});
export const mutate = () => undefined;
export const preload = () => undefined;
export interface SWRGlobalConfig {}
export type SWRConfiguration = unknown;
export type Revalidator = unknown;
export type RevalidatorOptions = unknown;
export type Key = unknown;
export type KeyLoader = unknown;
export type KeyedMutator<Data = unknown> = (data?: Data) => Promise<Data | undefined>;
export type SWRHook = typeof useSWR;
export type SWRResponse = unknown;
export type Cache = Map<unknown, unknown>;
export type BareFetcher = (...args: unknown[]) => unknown;
export type Fetcher = BareFetcher;
export type MutatorCallback = (...args: unknown[]) => unknown;
export type MutatorOptions = unknown;
export type Middleware = (...args: unknown[]) => unknown;
export type Arguments = unknown;
export type State = unknown;
export type ScopedMutator = typeof mutate;
