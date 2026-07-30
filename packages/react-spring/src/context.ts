import { createContext, useContext } from 'octane';
import type { SpringConfig } from './engine';

export interface SpringContextValue {
	cancel?: boolean;
	immediate?: boolean;
	pause?: boolean;
	config?: SpringConfig;
}

export const SpringContext = createContext<SpringContextValue>({});

export function useSpringContext(): SpringContextValue {
	return useContext(SpringContext);
}
