import { parseDate } from '@internationalized/date';

import {
	Button,
	Calendar,
	CalendarCell,
	CalendarGrid,
	ColorField,
	DateField,
	DateInput,
	DateSegment,
	DropZone,
	FileTrigger,
	Heading,
	Input,
	Label,
	useListData,
} from '../../src/components';

export function CalendarScenario(props: { onChange?: (value: unknown) => void }) {
	return (
		<Calendar
			aria-label="Appointment date"
			defaultValue={parseDate('2026-08-18')}
			onChange={props.onChange}
		>
			<header>
				<Button slot="previous">Previous</Button>
				<Heading />
				<Button slot="next">Next</Button>
			</header>
			<CalendarGrid>{(date) => <CalendarCell date={date} />}</CalendarGrid>
		</Calendar>
	);
}

export function DateFieldScenario() {
	return (
		<DateField defaultValue={parseDate('2026-08-18')}>
			<Label>Birth date</Label>
			<DateInput>{(segment) => <DateSegment segment={segment} />}</DateInput>
		</DateField>
	);
}

export function ColorFieldScenario(props: { onChange?: (value: unknown) => void }) {
	return (
		<ColorField defaultValue="#ff0" onChange={props.onChange}>
			<Label>Primary color</Label>
			<Input />
		</ColorField>
	);
}

export function FileTriggerScenario(props: { onSelect?: (files: FileList | null) => void } = {}) {
	return (
		<FileTrigger
			acceptedFileTypes={['image/png', 'image/jpeg']}
			allowsMultiple
			acceptDirectory
			onSelect={props.onSelect}
		>
			<Button>Choose files</Button>
		</FileTrigger>
	);
}

export function DropZoneScenario() {
	return <DropZone aria-label="Upload files">Drop files here</DropZone>;
}

export function ListDataScenario() {
	const data = useListData({
		initialItems: [
			{ id: 'a', name: 'Alpha' },
			{ id: 'b', name: 'Beta' },
		],
	});

	return (
		<div>
			<button id="append-item" onClick={() => data.append({ id: 'c', name: 'Gamma' })}>
				append
			</button>
			<button id="remove-item" onClick={() => data.remove('a')}>
				remove
			</button>
			<output data-testid="items">{data.items.map((item) => item.name).join(',')}</output>
		</div>
	);
}
