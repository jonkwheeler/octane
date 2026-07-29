/**
 * Phase 1 smoke: a static BarChart and LineChart mount through the full octane
 * pipeline (store, reporters, axes, graphical items) and produce plausible SVG
 * — bars as rectangles, lines as curves, axes with ticks. Byte-parity vs real
 * recharts is asserted separately by the differential suite.
 */
import { describe, it, expect, vi } from 'vitest';
import { mount, nextPaint } from '../_helpers';
import {
	BarChartApp,
	CartesianChartsApp,
	FunnelLegendApp,
	HierarchyChartsApp,
	LineChartApp,
	OverlayChartApp,
	PolarChartsApp,
	ResponsiveChartApp,
	ScatterAnimationCallbacksApp,
} from '../_fixtures/charts.tsrx';

async function settle() {
	// The chart pipeline is multi-pass: size lands via effect, axes/items
	// register via layout effects, offsets recompute, then the final paint —
	// plus a rAF for the store's autoBatch notifications.
	for (let i = 0; i < 10; i++) {
		await new Promise((r) => setTimeout(r, 0));
		await nextPaint();
	}
}

describe('Phase 1 chart pipeline (octane side)', () => {
	it('BarChart renders bars and axes', async () => {
		const r = mount(BarChartApp);
		await settle();
		const svg = r.find('svg.recharts-surface') as SVGSVGElement;
		expect(svg).toBeTruthy();
		expect(svg.getAttribute('width')).toBe('500');
		const bars = r.container.querySelectorAll('.recharts-bar-rectangle path.recharts-rectangle');
		expect(bars.length).toBe(12); // 6 data points × 2 series
		// Tick labels portal into the zIndex label layer (outside .recharts-xAxis).
		const xTicks = r.container.querySelectorAll(
			'.recharts-xAxis-tick-labels .recharts-cartesian-axis-tick-value',
		);
		expect(xTicks.length).toBe(6);
		const yTicks = r.container.querySelectorAll(
			'.recharts-yAxis-tick-labels .recharts-cartesian-axis-tick-value',
		);
		expect(yTicks.length).toBeGreaterThan(0);
		r.unmount();
	});

	it('LineChart renders curves and dots', async () => {
		const r = mount(LineChartApp);
		await settle();
		const curves = r.container.querySelectorAll('path.recharts-line-curve');
		expect(curves.length).toBe(2);
		for (const curve of curves) {
			expect(curve.getAttribute('d')).toMatch(/^M/);
		}
		const dots = r.container.querySelectorAll('.recharts-line-dots circle');
		expect(dots.length).toBe(12);
		r.unmount();
	});

	it('provides fixed responsive dimensions without a measurement pass', async () => {
		const result = mount(ResponsiveChartApp, {});
		await settle();
		const surface = result.container.querySelector('.recharts-surface');
		expect(surface?.getAttribute('width')).toBe('420');
		expect(surface?.getAttribute('height')).toBe('240');
		result.unmount();
	});

	it('renders registered legend and active tooltip content through chart portals', async () => {
		const result = mount(OverlayChartApp, {});
		await settle();
		expect(result.container.querySelector('.recharts-legend-wrapper')).toBeTruthy();
		expect(result.container.querySelector('.recharts-default-legend')).toBeTruthy();
		expect(result.container.querySelector('.recharts-tooltip-wrapper')).toBeTruthy();
		expect(result.container.textContent).toContain('UV');
		result.unmount();
	});

	it('renders area, composed, scatter, funnel, grid, and reference primitives', async () => {
		const result = mount(CartesianChartsApp, {});
		await settle();
		expect(result.container.querySelectorAll('path.recharts-area-area').length).toBe(2);
		expect(result.container.querySelector('path.recharts-line-curve')).toBeTruthy();
		expect(result.container.querySelectorAll('.recharts-scatter-symbol').length).toBe(2);
		expect(result.container.querySelectorAll('.recharts-funnel-trapezoid').length).toBe(2);
		expect(result.container.querySelector('.recharts-cartesian-grid')).toBeTruthy();
		expect(result.container.querySelector('.recharts-reference-line')).toBeTruthy();
		result.unmount();
	});

	it('registers Funnel segments in the legend with their names and colors', async () => {
		const result = mount(FunnelLegendApp, {});
		await settle();
		const items = result.container.querySelectorAll('.recharts-legend-item');
		expect(items).toHaveLength(2);
		expect(result.container.textContent).toContain('Visitors');
		expect(result.container.textContent).toContain('Customers');
		expect(result.container.innerHTML).toContain('#ff0000');
		expect(result.container.innerHTML).toContain('#0000ff');
		result.unmount();
	});

	it('keeps hidden Funnel segments inactive in the legend and suppresses legendType none', async () => {
		const hidden = mount(FunnelLegendApp, { hide: true });
		await settle();
		expect(hidden.container.querySelectorAll('.recharts-legend-item')).toHaveLength(2);
		expect(hidden.container.textContent).toContain('Visitors');
		expect(hidden.container.textContent).toContain('Customers');
		expect(hidden.container.querySelectorAll('.recharts-funnel-trapezoid')).toHaveLength(0);
		expect(hidden.container.innerHTML).toContain('#ccc');
		hidden.unmount();

		const none = mount(FunnelLegendApp, { legendType: 'none' });
		await settle();
		expect(none.container.querySelectorAll('.recharts-legend-item')).toHaveLength(0);
		none.unmount();
	});

	it('forwards Scatter animation lifecycle callbacks', async () => {
		let frameTime = performance.now();
		vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) =>
			setTimeout(() => callback((frameTime += 16)), 0),
		);
		vi.stubGlobal('cancelAnimationFrame', (handle: number) => clearTimeout(handle));
		const starts: string[] = [];
		const ends: string[] = [];
		try {
			const result = mount(ScatterAnimationCallbacksApp, {
				onAnimationStart: () => starts.push('start'),
				onAnimationEnd: () => ends.push('end'),
			});
			await settle();
			expect(starts).toEqual(['start']);
			expect(ends).toEqual(['end']);
			result.unmount();
		} finally {
			vi.unstubAllGlobals();
		}
	});

	it('renders pie, radar, radial bar, and polar axes', async () => {
		const result = mount(PolarChartsApp, {});
		await settle();
		expect(result.container.querySelectorAll('.recharts-pie-sector').length).toBe(2);
		expect(result.container.querySelector('.recharts-radar-polygon')).toBeTruthy();
		expect(result.container.querySelectorAll('.recharts-radial-bar-sector').length).toBe(2);
		expect(result.container.querySelector('.recharts-polar-grid')).toBeTruthy();
		expect(result.container.querySelector('.recharts-polar-angle-axis')).toBeTruthy();
		expect(result.container.querySelector('.recharts-polar-radius-axis')).toBeTruthy();
		result.unmount();
	});

	it('renders sankey and sunburst hierarchy charts', async () => {
		const result = mount(HierarchyChartsApp, {});
		await settle();
		expect(result.container.querySelectorAll('.recharts-sankey-node').length).toBe(3);
		expect(result.container.querySelectorAll('.recharts-sankey-link').length).toBe(2);
		expect(result.container.querySelectorAll('.recharts-sunburst path.recharts-sector').length).toBe(2);
		result.unmount();
	});
});
