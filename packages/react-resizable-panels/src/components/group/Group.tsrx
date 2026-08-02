import { useEffect, useId, useMemo, useRef, useState } from 'octane';
import { GroupContext, type GroupContextValue } from './GroupContext';
import type { GroupImperativeHandle, GroupProps, Layout } from './types';

function setRef<T>(ref: GroupProps['elementRef'] | GroupProps['groupRef'], value: T | null) {
	if (Array.isArray(ref)) {
		for (const child of ref) setRef(child as GroupProps['elementRef'], value);
	} else if (typeof ref === 'function') ref(value as never);
	else if (ref) (ref as { current: unknown }).current = value;
}
function percent(value: number | string | undefined): number | undefined {
	if (value === undefined) return undefined;
	const parsed = Number.parseFloat(String(value));
	return Number.isFinite(parsed) ? parsed : undefined;
}

export function Group({ children, defaultLayout, disabled = false, elementRef, groupRef, id: idProp, onLayoutChange, onLayoutChanged, orientation = 'horizontal', style, ...rest }: GroupProps) @{
	const dynamicId = useId();
	const id = String(idProp ?? dynamicId);
	const element = useRef<HTMLDivElement | null>(null);
	const panelIds = useRef<string[]>([]);
	const [layout, setLayout] = useState<Layout>({ ...(defaultLayout ?? {}) });
	const adoptedDefinedDefault = useRef(defaultLayout !== undefined);
	const layoutChangedAfterMount = useRef(false);

	function apply(next: Layout, user: boolean, completed = true, protectFromRestore = user): Layout {
		if (protectFromRestore) layoutChangedAfterMount.current = true;
		setLayout(next);
		onLayoutChange?.(next);
		if (completed) onLayoutChanged?.(next, { isUserInteraction: user });
		return next;
	}
	useEffect(() => {
		if (
			!adoptedDefinedDefault.current &&
			defaultLayout !== undefined &&
			!layoutChangedAfterMount.current
		) {
			adoptedDefinedDefault.current = true;
			apply({ ...defaultLayout }, false);
		}
	}, [defaultLayout]);
	const api = useMemo<GroupContextValue>(() => ({
		id, orientation, disabled,
		registerPanel(panelId, defaultSize) {
			if (!panelIds.current.includes(panelId)) {
				panelIds.current.push(panelId);
				if (layout[panelId] === undefined) {
					const explicit = percent(defaultSize);
					const size = explicit ?? 100 / panelIds.current.length;
					const next = { ...layout, [panelId]: size };
					for (const other of panelIds.current) if (other !== panelId && explicit === undefined) next[other] = size;
					apply(next, false);
				}
			}
			return () => { panelIds.current = panelIds.current.filter((current) => current !== panelId); };
		},
		resizeSeparator(separator, delta, completed) {
			const children = [...(separator.parentElement?.children ?? [])];
			const separatorIndex = children.indexOf(separator);
			const before = children.slice(0, separatorIndex).reverse().find((node) => (node as HTMLElement).hasAttribute('data-panel')) as HTMLElement | undefined;
			const after = children.slice(separatorIndex + 1).find((node) => (node as HTMLElement).hasAttribute('data-panel')) as HTMLElement | undefined;
			if (!before || !after) return;
			const groupSize = orientation === 'horizontal' ? element.current?.clientWidth : element.current?.clientHeight;
			if (!groupSize) return;
			const amount = delta / groupSize * 100;
			const beforeId = before.id, afterId = after.id;
			const nextBefore = Math.max(0, Math.min(100, (layout[beforeId] ?? 50) + amount));
			const next = { ...layout, [beforeId]: nextBefore, [afterId]: (layout[beforeId] ?? 50) + (layout[afterId] ?? 50) - nextBefore };
			apply(next, true, completed);
		},
		getPanelSize: (panelId) => layout[panelId] ?? 0,
		setPanelSize(panelId, size) { apply({ ...layout, [panelId]: Math.max(0, Math.min(100, size)) }, false, true, true); },
		getLayout: () => ({ ...layout }),
	}), [id, orientation, disabled, layout, onLayoutChange, onLayoutChanged]);

	useEffect(() => {
		const handle: GroupImperativeHandle = { getLayout: api.getLayout, setLayout: (next) => apply({ ...next }, false, true, true) };
		setRef(groupRef, handle);
		return () => setRef(groupRef, null);
	}, [api, groupRef]);

	return <GroupContext.Provider value={api}><div {...rest} data-group data-testid={id} id={id} ref={(node) => { element.current = node; setRef(elementRef, node); }} style={{ height: '100%', width: '100%', overflow: 'hidden', ...style, display: 'flex', flexDirection: orientation === 'horizontal' ? 'row' : 'column', flexWrap: 'nowrap', touchAction: orientation === 'horizontal' ? 'pan-y' : 'pan-x' }}>{children}</div></GroupContext.Provider>;
}
(Group as { displayName?: string }).displayName = 'Group';
