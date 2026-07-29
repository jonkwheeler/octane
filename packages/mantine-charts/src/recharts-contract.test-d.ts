import type { XAxisProps } from '@octanejs/recharts';

const validXAxisProps: XAxisProps = { dataKey: 'month', tickCount: 6 };

// @ts-expect-error -- the private declaration boundary must reject misspelled Recharts props.
const invalidXAxisProps: XAxisProps = { dattaKey: 'month' };

void validXAxisProps;
void invalidXAxisProps;
