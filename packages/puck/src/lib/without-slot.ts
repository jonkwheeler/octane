export function withoutSlot<T>(value: T | symbol | undefined): T | undefined {
  return typeof value === 'symbol' ? undefined : value;
}
