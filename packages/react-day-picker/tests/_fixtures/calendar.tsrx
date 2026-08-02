// @ts-nocheck -- fixtures intentionally exercise React-compatible DOM prop boundaries.
import { useState } from 'octane';
import { DayPicker, type DateRange, type DayButtonProps } from '../../src/index.ts';

export function CalendarFixture() @{
	const [selected, setSelected] = useState<Date | undefined>();
	<main>
		<output id="selection">{selected?.toISOString().slice(0, 10) ?? 'none'}</output>
		<DayPicker
			mode="single"
			month={new Date(2026, 7, 1)}
			selected={selected}
			onSelect={setSelected}
		/>
	</main>
}

export function ServerCalendarFixture() @{
	<DayPicker month={new Date(2026, 7, 1)} />
}

export function NavigationFixture() @{
	<DayPicker defaultMonth={new Date(2026, 7, 1)} />
}

export function TimeZoneNavigationFixture() @{
	const [timeZone, setTimeZone] = useState('UTC');
	<main>
		<button onClick={() => setTimeZone('America/Los_Angeles')}>Use Los Angeles</button>
		<DayPicker defaultMonth={new Date('2026-08-01T01:00:00.000Z')} timeZone={timeZone} />
	</main>
}

export function MultipleFixture() @{
	const [selected, setSelected] = useState<Date[]>([]);
	<main>
		<output id="multiple-count">{selected.length}</output>
		<DayPicker
			mode="multiple"
			month={new Date(2026, 7, 1)}
			selected={selected}
			onSelect={setSelected}
		/>
	</main>
}

export function RangeFixture() @{
	const [selected, setSelected] = useState<DateRange | undefined>();
	<main>
		<output id="range-value">
			{selected?.from?.getDate() ?? '-'}:{selected?.to?.getDate() ?? '-'}
		</output>
		<DayPicker
			mode="range"
			month={new Date(2026, 7, 1)}
			selected={selected}
			onSelect={setSelected}
		/>
	</main>
}

function CustomDayButton(props: DayButtonProps) @{
	const { day, modifiers: _modifiers, children: _children, ...buttonProps } = props;
	<button {...buttonProps} data-custom-day="true">{day.date.getDate()}</button>
}

export function ConstraintsFixture() @{
	<DayPicker
		mode="single"
		month={new Date(2026, 7, 1)}
		disabled={new Date(2026, 7, 10)}
		hidden={new Date(2026, 7, 11)}
		showOutsideDays
		components={{ DayButton: CustomDayButton }}
	/>
}
