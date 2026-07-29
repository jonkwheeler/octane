'use client';

import { OctaneCompat } from 'octane/react';
import { MigratedSalesChart } from './migrated-sales-chart';

export function RechartsIsland() {
	return <OctaneCompat component={MigratedSalesChart} />;
}
