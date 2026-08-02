import { describe, expect, it } from 'vitest';
import packageJson from '../../package.json';

describe('@octanejs/tanstack-router documented divergences', () => {
	// OCTANE DIVERGENCE[tanstack-router-separate-devtools][adapted:tanstack-router-separate-devtools]
	// @parity-case adapted:tanstack-router-separate-devtools
	it('does not publish the separately distributed React devtools', () => {
		expect(packageJson.exports).not.toHaveProperty('./devtools');
		expect(Object.keys(packageJson.dependencies)).not.toContain('@tanstack/react-router-devtools');
	});
});
