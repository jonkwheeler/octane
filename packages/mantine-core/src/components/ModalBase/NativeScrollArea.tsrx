import type { OctaneNode } from 'octane';
interface NativeScrollAreaProps {
  children: OctaneNode;
}

export function NativeScrollArea({ children }: NativeScrollAreaProps) {
  return <>{children}</>;
}
