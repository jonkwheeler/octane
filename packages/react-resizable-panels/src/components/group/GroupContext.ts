import { createContext } from 'octane';
import type { Layout, Orientation } from './types';

export type GroupContextValue = {
	id: string;
	orientation: Orientation;
	disabled: boolean;
	registerPanel(id: string, defaultSize: number | string | undefined): () => void;
	resizeSeparator(separator: HTMLElement, delta: number, completed: boolean): void;
	getPanelSize(id: string): number;
	setPanelSize(id: string, size: number): void;
	getLayout(): Layout;
};

export const GroupContext = createContext<GroupContextValue | null>(null);
