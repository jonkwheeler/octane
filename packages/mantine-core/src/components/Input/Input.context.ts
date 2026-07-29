import { createContext } from 'octane';
import { MantineSize } from '../../core';

interface InputContextValue {
  size: MantineSize | (string & {});
}

export const InputContext = createContext<InputContextValue>({ size: 'sm' });
