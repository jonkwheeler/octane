import { bind, Subscribe } from '@octanejs/rxjs';
import type { Observable } from 'rxjs';

export const [useValue] = bind((source: Observable<number>) => source, -1);

export function Reader(props: { source: Observable<number> }) @{
	const value = useValue(props.source);
	<output id="value">{value as any}</output>
}

export function SubscribeReader(props: { source: Observable<number> }) @{
	<Subscribe source$={props.source} fallback={<span id="fallback">{'loading'}</span>}>
		<Reader source={props.source} />
	</Subscribe>
}
