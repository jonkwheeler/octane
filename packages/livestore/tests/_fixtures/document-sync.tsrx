import type { Store } from '@livestore/livestore';
import { useSyncStatus } from '@octanejs/livestore';

export function DocumentReader(props: {
	store: Store<any> & {
		useClientDocument: (...args: any[]) => any;
	};
	table: any;
	id?: any;
	onSetter: (setter: (value: any) => void) => void;
}) @{
	const [row, setRow, id] = props.store.useClientDocument(props.table, props.id);
	props.onSetter(setRow);
	<div id="document" data-id={id}>{JSON.stringify(row)}</div>
}

export function SyncReader(props: { store: Store<any> }) @{
	const status = useSyncStatus({ store: props.store });
	<div id="sync">{JSON.stringify(status)}</div>
}
