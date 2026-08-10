// Differential fixtures: the SAME source runs through @octanejs/cmdk (octane)
// and the published cmdk@1.1.1 (React) — `_setup.ts` rewrites the import for the
// React side. Keep these free of anything non-deterministic.
import { Command } from '@octanejs/cmdk';

// Flat list: the byte-equal baseline (render, filter, keyboard, empty state).
// Salad leads so a query of "a" ranks Apple above Salad — source order and
// score order disagree, which is what pins the CSS-order ranking divergence.
export function CmdkDiff() @{
	<Command label="Command Menu">
		<Command.Input placeholder="Search…" />
		<Command.List>
			<Command.Empty>No results found.</Command.Empty>
			<Command.Item>Salad</Command.Item>
			<Command.Item>Apple</Command.Item>
			<Command.Item>Banana</Command.Item>
			<Command.Item>Cherry</Command.Item>
		</Command.List>
	</Command>
}

// Grouped list: exercises headings, separators and group visibility. Group
// ORDER is a documented divergence (upstream's group reorder is dead code), so
// the parity suite drives this one through `observe`, not `step`.
export function CmdkDiffGroups() @{
	<Command label="Command Menu">
		<Command.Input placeholder="Search…" />
		<Command.List>
			<Command.Empty>No results found.</Command.Empty>
			<Command.Group heading="Fruits">
				<Command.Item>Apple</Command.Item>
				<Command.Item>Banana</Command.Item>
			</Command.Group>
			<Command.Separator />
			<Command.Group heading="Vegetables">
				<Command.Item>Carrot</Command.Item>
				<Command.Item>Potato</Command.Item>
			</Command.Group>
		</Command.List>
	</Command>
}

// Force-mounted item stays visible through any search; Empty must consult it.
export function CmdkDiffForceMount() @{
	<Command label="Command Menu">
		<Command.Input placeholder="Search…" />
		<Command.List>
			<Command.Empty>No results found.</Command.Empty>
			<Command.Item forceMount>Always Here</Command.Item>
			<Command.Item>Apple</Command.Item>
		</Command.List>
	</Command>
}

// Force-mounted non-match after a real match: pins where unranked items land.
export function CmdkDiffForceMountRank() @{
	<Command label="Command Menu">
		<Command.Input placeholder="Search…" />
		<Command.List>
			<Command.Item>Apple</Command.Item>
			<Command.Item forceMount>Always Here</Command.Item>
			<Command.Item>Apricot</Command.Item>
		</Command.List>
	</Command>
}

// Toggle a force-mounted item that shares a value with a plain replacement.
export function CmdkDiffForceMountSwap(props: { forced: boolean }) @{
	<Command label="Command Menu">
		<Command.List>
			@if (props.forced) {
				<Command.Item forceMount value="Apple">Apple</Command.Item>
			}
			@if (!props.forced) {
				<Command.Item value="Apple">Apple</Command.Item>
			}
		</Command.List>
	</Command>
}
