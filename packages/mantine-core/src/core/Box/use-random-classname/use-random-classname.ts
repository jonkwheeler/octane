import { useId } from 'octane';

export function useRandomClassName() {
  const id = useId().replace(/[:«»]/g, '');
  return `__m__-${id}`;
}
