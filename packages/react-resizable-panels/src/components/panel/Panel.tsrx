import { useEffect, useId, useRef } from 'octane';
import { useGroupContext } from '../group/useGroupContext';
import type { PanelImperativeHandle, PanelProps } from './types';

function assign<T>(ref: PanelProps['elementRef'] | PanelProps['panelRef'], value: T | null) {
	if (Array.isArray(ref)) for (const child of ref) assign(child as PanelProps['elementRef'], value);
	else if (typeof ref === 'function') ref(value as never);
	else if (ref) (ref as { current: unknown }).current = value;
}

export function Panel({ children, className, collapsedSize = '0%', collapsible = false, defaultSize, disabled, elementRef, id: idProp, onResize, panelRef, style, ...rest }: PanelProps) @{
	const dynamicId = useId();
	const id = String(idProp ?? dynamicId);
	const group = useGroupContext();
	const element = useRef<HTMLDivElement | null>(null);
	useEffect(() => group.registerPanel(id, defaultSize), [group, id, defaultSize]);
	useEffect(() => {
		const getSize = () => { const asPercentage = group.getPanelSize(id); const groupPixels = group.orientation === 'horizontal' ? element.current?.parentElement?.clientWidth : element.current?.parentElement?.clientHeight; return { asPercentage, inPixels: (groupPixels ?? 0) * asPercentage / 100 }; };
		const collapsed = Number.parseFloat(String(collapsedSize));
		const handle: PanelImperativeHandle = { collapse: () => { if (collapsible) group.setPanelSize(id, collapsed); }, expand: () => { if (group.getPanelSize(id) === collapsed) group.setPanelSize(id, Number.parseFloat(String(defaultSize ?? 50))); }, getSize, isCollapsed: () => group.getPanelSize(id) === collapsed, resize: (value) => group.setPanelSize(id, Number.parseFloat(String(value))) };
		assign(panelRef, handle); return () => assign(panelRef, null);
	}, [group, id, panelRef, collapsible, collapsedSize, defaultSize]);
	const size = group.getPanelSize(id) || Number.parseFloat(String(defaultSize ?? 1));
	return <div {...rest} data-disabled={disabled || undefined} data-panel data-testid={id} id={id} ref={(node) => { element.current = node; assign(elementRef, node); }} style={{ minHeight: 0, maxHeight: '100%', height: 'auto', minWidth: 0, maxWidth: '100%', width: 'auto', display: 'flex', flexBasis: 0, flexShrink: 1, overflow: 'visible', flexGrow: size }}><div className={className} style={{ maxHeight: '100%', maxWidth: '100%', flexGrow: 1, overflow: 'auto', ...style, touchAction: group.orientation === 'horizontal' ? 'pan-y' : 'pan-x' }}>{children}</div></div>;
}
(Panel as { displayName?: string }).displayName = 'Panel';
