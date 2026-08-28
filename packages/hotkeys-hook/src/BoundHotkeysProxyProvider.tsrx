import { createContext, type OctaneNode, useContext } from 'octane';
import type { Hotkey } from './types';

type BoundHotkeysProxyProviderType = {
	addHotkey: (hotkey: Hotkey) => void;
	removeHotkey: (hotkey: Hotkey) => void;
};

const BoundHotkeysProxyProvider = createContext<BoundHotkeysProxyProviderType | undefined>(
	undefined,
);

export const useBoundHotkeysProxy = () => {
	return useContext(BoundHotkeysProxyProvider);
};

interface Props {
	children: OctaneNode;
	addHotkey: (hotkey: Hotkey) => void;
	removeHotkey: (hotkey: Hotkey) => void;
}

export default function BoundHotkeysProxyProviderProvider({
	addHotkey,
	removeHotkey,
	children,
}: Props) {
	return <BoundHotkeysProxyProvider.Provider
		value={{ addHotkey, removeHotkey }}
	>{children}</BoundHotkeysProxyProvider.Provider>;
}
