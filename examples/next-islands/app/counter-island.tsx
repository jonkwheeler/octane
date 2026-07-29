'use client';

import { OctaneCompat } from 'octane/react';
import { Counter } from './counter.tsrx';

export function CounterIsland() {
	return <OctaneCompat component={Counter} props={{ initialCount: 1 }} />;
}
