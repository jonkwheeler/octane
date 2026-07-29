import { createContext } from 'octane';
import type { IconProps } from './types';

export const IconContext = createContext<IconProps>({
	color: 'currentColor',
	size: '1em',
	weight: 'regular',
	mirrored: false,
});
