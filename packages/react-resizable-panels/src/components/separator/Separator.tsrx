import { useId, useRef, useState } from 'octane';
import { useGroupContext } from '../group/useGroupContext';
import type { SeparatorProps } from './types';

function assign(ref: SeparatorProps['elementRef'], value: HTMLDivElement | null) {
	if (Array.isArray(ref)) for (const child of ref) assign(child, value);
	else if (typeof ref === 'function') ref(value);
	else if (ref) (ref as { current: HTMLDivElement | null }).current = value;
}

export function Separator({ children, disabled, elementRef, id: idProp, style, ...rest }: SeparatorProps) @{
	const dynamicId = useId(); const id = String(idProp ?? dynamicId); const group = useGroupContext();
	const element = useRef<HTMLDivElement | null>(null); const start = useRef(0); const previous = useRef(0); const [active, setActive] = useState(false); const [focused, setFocused] = useState(false);
	function coordinate(event: PointerEvent) { return group.orientation === 'horizontal' ? event.clientX : event.clientY; }
	function onPointerDown(event: PointerEvent) { if (disabled || group.disabled) return; start.current = previous.current = coordinate(event); setActive(true); (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId); }
	function onPointerMove(event: PointerEvent) { if (!active || !element.current) return; const next = coordinate(event); group.resizeSeparator(element.current, next - previous.current, false); previous.current = next; }
	function onPointerUp(event: PointerEvent) { if (!active || !element.current) return; group.resizeSeparator(element.current, 0, true); setActive(false); (event.currentTarget as HTMLElement).releasePointerCapture?.(event.pointerId); }
	function onKeyDown(event: KeyboardEvent) { if (disabled || group.disabled || !element.current) return; let delta = 0; if (event.key === 'Home') delta = -10000; else if (event.key === 'End') delta = 10000; else if (event.key === (group.orientation === 'horizontal' ? 'ArrowLeft' : 'ArrowUp')) delta = -10; else if (event.key === (group.orientation === 'horizontal' ? 'ArrowRight' : 'ArrowDown')) delta = 10; else return; event.preventDefault(); group.resizeSeparator(element.current, delta, true); }
	const data = disabled ? 'disabled' : active ? 'active' : focused ? 'focus' : 'inactive';
	return <div {...rest} aria-disabled={disabled || undefined} aria-orientation={group.orientation === 'horizontal' ? 'vertical' : 'horizontal'} data-separator={data} data-testid={id} id={id} onBlur={() => setFocused(false)} onFocus={() => setFocused(true)} onKeyDown={onKeyDown} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} ref={(node) => { element.current = node; assign(elementRef, node); }} role="separator" style={{ flexBasis: 'auto', cursor: disabled ? 'not-allowed' : undefined, ...style, flexGrow: 0, flexShrink: 0, touchAction: 'none' }} tabIndex={disabled ? undefined : 0}>{children}</div>;
}
(Separator as { displayName?: string }).displayName = 'Separator';
