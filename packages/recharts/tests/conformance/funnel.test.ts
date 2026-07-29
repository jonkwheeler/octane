import { describe, expect, it } from 'vitest';
import { computeFunnelTrapezoids } from '../../src/cartesian/Funnel.tsrx';

describe('computeFunnelTrapezoids', () => {
	it('normalizes a ranged value followed by a numeric value', () => {
		const trapezoids = computeFunnelTrapezoids({
			dataKey: 'value',
			nameKey: 'name',
			displayedData: [
				{ name: 'Range', value: [100, 80] },
				{ name: 'Number', value: 60 },
			],
			lastShapeType: 'triangle',
			reversed: false,
			offset: { left: 0, top: 0, width: 200, height: 100 } as never,
			customWidth: undefined,
			graphicalItemId: 'funnel-regression',
		});

		expect(trapezoids[0]).toMatchObject({
			val: 100,
			upperWidth: 200,
			lowerWidth: 160,
		});
		expect(trapezoids[0].tooltipPayload[0].value).toBe(100);
		expect(trapezoids[1]).toMatchObject({
			val: 60,
			upperWidth: 120,
			lowerWidth: 0,
		});
		for (const trapezoid of trapezoids) {
			expect([trapezoid.x, trapezoid.upperWidth, trapezoid.lowerWidth].every(Number.isFinite)).toBe(
				true,
			);
		}
	});
});
