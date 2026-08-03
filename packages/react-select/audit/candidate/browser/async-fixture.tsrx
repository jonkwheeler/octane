import { useAsync, type AsyncProps } from '../../../src/async';

export type AsyncOption = { label: string; value: string };
export type AsyncResult = ReturnType<typeof useAsync<AsyncOption, never>>;

export function AsyncFixture(props: {
	asyncProps: AsyncProps<AsyncOption, never>;
	bind: (result: AsyncResult) => void;
}) @{
	const result = useAsync(props.asyncProps);
	props.bind(result);
	<output
		data-loading={String(result.isLoading)}
		data-options={JSON.stringify(result.options)}
	/>
}
