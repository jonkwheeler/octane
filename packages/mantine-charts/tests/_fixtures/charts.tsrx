import { MantineProvider } from '@octanejs/mantine-core';
import {
	BarChart,
	DonutChart,
	FunnelChart,
	LineChart,
	PieChart,
	RadarChart,
	RadialBarChart,
	SankeyChart,
	SunburstChart,
} from '@octanejs/mantine-charts';

const data = [
	{ month: 'Jan', apples: 12, oranges: 8 },
	{ month: 'Feb', apples: 18, oranges: 14 },
	{ month: 'Mar', apples: 9, oranges: 20 },
];

export function MantineChartsApp() @{
	<MantineProvider>
		<LineChart
			h={240}
			data={data}
			dataKey="month"
			series={[
				{ name: 'apples', color: 'blue.6' },
				{ name: 'oranges', color: 'orange.6' },
			]}
			withLegend
		/>
		<BarChart
			h={240}
			data={data}
			dataKey="month"
			series={[{ name: 'apples', color: 'violet.6' }]}
		/>
		<PieChart
			h={240}
			data={[
				{ name: 'A', value: 60, color: 'blue.6' },
				{ name: 'B', value: 40, color: 'orange.6' },
			]}
		/>
	</MantineProvider>
}

export function MantineExtendedChartsApp() @{
	<MantineProvider>
		<DonutChart data={[
			{ name: 'A', value: 60, color: 'blue.6' },
			{ name: 'B', value: 40, color: 'orange.6' },
		]} />
		<RadarChart
			h={240}
			data={[
				{ subject: 'A', score: 80 },
				{ subject: 'B', score: 60 },
				{ subject: 'C', score: 90 },
			]}
			dataKey="subject"
			series={[{ name: 'score', color: 'violet.6' }]}
		/>
		<RadialBarChart
			h={240}
			data={[
				{ name: 'A', value: 80, color: 'blue.6' },
				{ name: 'B', value: 60, color: 'orange.6' },
			]}
			dataKey="value"
		/>
		<FunnelChart
			data={[
				{ name: 'A', value: 100, color: 'blue.6' },
				{ name: 'B', value: 60, color: 'orange.6' },
			]}
		/>
		<SankeyChart
			height={240}
			data={{
				nodes: [{ name: 'Start' }, { name: 'Middle' }, { name: 'End' }],
				links: [
					{ source: 0, target: 1, value: 10 },
					{ source: 1, target: 2, value: 7 },
				],
			}}
		/>
		<SunburstChart
			data={[
				{ name: 'A', value: 60, color: 'blue.6' },
				{ name: 'B', value: 40, color: 'orange.6' },
			]}
		/>
	</MantineProvider>
}
