import {
	type inferParserType,
	createLoader,
	createSerializer,
	parseAsInteger,
	parseAsString,
	useQueryState,
	useQueryStates,
} from '@octanejs/nuqs';

declare function expectType<T>(value: T): void;

const integer = parseAsInteger.withDefault(0);
type Integer = inferParserType<typeof integer>;
expectType<Integer>(0);

const [count, setCount] = useQueryState('count', integer);
expectType<number>(count);
expectType<Promise<URLSearchParams>>(setCount((current) => current + 1));

const [filters, setFilters] = useQueryStates({ q: parseAsString.withDefault(''), page: integer });
expectType<{ q: string; page: number }>(filters);
expectType<Promise<URLSearchParams>>(setFilters({ q: 'octane', page: 2 }));

const load = createLoader({ q: parseAsString, page: parseAsInteger });
expectType<{ q: string | null; page: number | null }>(load('?q=x&page=2'));

const serialize = createSerializer({ q: parseAsString, page: parseAsInteger });
expectType<string>(serialize({ q: 'x', page: 2 }));
