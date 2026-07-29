/** @jsxImportSource octane */
import { useState } from 'octane';
import { Bar, BarChart, XAxis, YAxis } from '@octanejs/recharts';

const historical = [
	{ month: 'Jan', sales: 260 },
	{ month: 'Feb', sales: 400 },
	{ month: 'Mar', sales: 320 },
];

const current = [
	{ month: 'Jan', sales: 310 },
	{ month: 'Feb', sales: 440 },
	{ month: 'Mar', sales: 520 },
];

export function MigratedSalesChart() {
	const [data, setData] = useState(historical);
	const topValue = Math.max(...data.map((entry) => entry.sales));

	return (
		<section className="island" role="region" aria-label="Migrated sales chart">
			<h2>Migrated Recharts leaf</h2>
			<p>Top value: {topValue}</p>
			<BarChart width={500} height={240} data={data}>
				<XAxis dataKey="month" />
				<YAxis />
				<Bar dataKey="sales" fill="#6d5dfc" isAnimationActive={false} />
			</BarChart>
			<button type="button" onClick={() => setData(current)}>
				Load current data
			</button>
		</section>
	);
}
