import type {
	Context,
	Dispatch,
	FunctionComponentElement,
	ProviderProps,
	ReactNode,
	Reducer,
} from 'react';

type ReducerState<R> = R extends Reducer<infer S, unknown> ? S : never;
type ReducerAction<R> = R extends Reducer<unknown, infer A> ? A : never;
type ReducerValue<R> = [ReducerState<R>, Dispatch<ReducerAction<R>>];

declare const createReducerContext: <R extends Reducer<unknown, unknown>>(
	reducer: R,
	defaultInitialState: ReducerState<R>,
) => readonly [
	() => ReducerValue<R>,
	(props: {
		children?: ReactNode;
		initialState?: ReducerState<R>;
	}) => FunctionComponentElement<ProviderProps<ReducerValue<R> | undefined>>,
	Context<ReducerValue<R> | undefined>,
];

export default createReducerContext;
