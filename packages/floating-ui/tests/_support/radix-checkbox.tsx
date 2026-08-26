/** @jsxImportSource octane */
import type { OctaneNode } from 'octane';

export function Root(props: {
	checked?: boolean;
	children?: OctaneNode;
	onCheckedChange?: (checked: boolean) => void;
}) {
	return (
		<button
			type="button"
			role="checkbox"
			aria-checked={props.checked ?? false}
			onClick={() => props.onCheckedChange?.(!props.checked)}
		>
			{props.children}
		</button>
	);
}

export function Indicator(props: { children?: OctaneNode }) {
	return <span>{props.children}</span>;
}
