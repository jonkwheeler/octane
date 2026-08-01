import { use } from 'octane';
import { ModalsContext } from '../context';

export function useModals() {
  const ctx = use(ModalsContext);

  if (!ctx) {
    throw new Error(
      '[@mantine/modals] useModals hook was called outside of context, wrap your app with ModalsProvider component'
    );
  }

  return ctx;
}
