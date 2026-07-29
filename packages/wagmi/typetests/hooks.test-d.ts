import type { Config } from '@wagmi/core';
import { useBalance, useConnect, useSignMessage, type UseBalanceParameters } from '@octanejs/wagmi';

declare function expectType<T>(value: T): void;
declare const config: Config;

function consumerTypeFixtures() {
	const balanceOptions = {
		address: '0x0000000000000000000000000000000000000001',
		query: { select: (balance: { value: bigint }) => balance.value },
	} satisfies UseBalanceParameters<Config, bigint>;
	const balance = useBalance(balanceOptions);
	expectType<bigint | undefined>(balance.data);
	expectType<Error | null>(balance.error);

	const connect = useConnect({ config });
	expectType<void>(connect.connect({ connector: config.connectors[0]! }));
	expectType<Promise<unknown>>(connect.connectAsync({ connector: config.connectors[0]! }));
	expectType<'idle' | 'pending' | 'error' | 'success'>(connect.status);

	const sign = useSignMessage();
	expectType<void>(sign.mutate({ message: 'octane' }));
	expectType<Promise<`0x${string}`>>(sign.signMessageAsync({ message: 'octane' }));
	expectType<`0x${string}` | undefined>(sign.data);

	// @ts-expect-error connect variables require a live connector.
	connect.mutate({});
	// @ts-expect-error balance addresses are hex-prefixed.
	useBalance({ address: 'not-an-address' });
}

void consumerTypeFixtures;
