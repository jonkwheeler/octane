import { createContext } from 'octane';

export interface MenuCheckboxGroupContextValue {
  values: string[];
  onChange: (value: string) => void;
}

export const MenuCheckboxGroupContext = createContext<MenuCheckboxGroupContextValue | null>(null);
