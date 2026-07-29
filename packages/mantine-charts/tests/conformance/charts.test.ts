import { describe, expect, it } from 'vitest';
import { MantineChartsApp, MantineExtendedChartsApp } from '../_fixtures/charts.tsrx';
import { mount, nextPaint } from '../_helpers';

async function settle() {
	for (let index = 0; index < 10; index += 1) {
		await Promise.resolve();
		await nextPaint();
	}
}

describe('@octanejs/mantine-charts', () => {
	function installBrowserMeasurements() {
		window.matchMedia = () =>
			({
				matches: false,
				addEventListener() {},
				removeEventListener() {},
			}) as unknown as MediaQueryList;
		globalThis.ResizeObserver = class {
			constructor(private readonly callback: ResizeObserverCallback) {}
			observe(target: Element) {
				this.callback(
					[
						{
							target,
							contentRect: {
								width: 500,
								height: 240,
							},
						} as ResizeObserverEntry,
					],
					this,
				);
			}
			unobserve() {}
			disconnect() {}
		};
	}

	it('renders Mantine line, bar, and pie charts through Octane Recharts', async () => {
		installBrowserMeasurements();

		const result = mount(MantineChartsApp, {});
		await settle();

		expect(result.container.querySelector('.mantine-LineChart-root')).toBeTruthy();
		expect(result.container.querySelector('path.recharts-line-curve')).toBeTruthy();
		expect(result.container.querySelectorAll('.recharts-bar-rectangle').length).toBe(3);
		expect(result.container.querySelectorAll('.recharts-pie-sector').length).toBe(2);
		result.unmount();
	});

	it('renders Mantine polar and hierarchy chart wrappers', async () => {
		installBrowserMeasurements();
		const result = mount(MantineExtendedChartsApp, {});
		await settle();

		expect(result.container.querySelector('.mantine-DonutChart-root')).toBeTruthy();
		expect(result.container.querySelector('.recharts-radar-polygon')).toBeTruthy();
		expect(result.container.querySelector('.recharts-radial-bar-sector')).toBeTruthy();
		expect(result.container.querySelector('.recharts-funnel-trapezoid')).toBeTruthy();
		expect(result.container.querySelector('.recharts-sankey-nodes')).toBeTruthy();
		expect(result.container.querySelector('.recharts-sunburst path.recharts-sector')).toBeTruthy();
		result.unmount();
	});
});
