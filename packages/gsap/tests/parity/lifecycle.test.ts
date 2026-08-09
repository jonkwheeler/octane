/**
 * Repo-authored adapted runtime suite for @octanejs/gsap.
 *
 * Upstream @gsap/react 2.1.2 ships no executable tests, so this inventory is
 * the Octane-side stand-in for an adapted upstream suite. React comparison
 * lives in the dedicated differential project; these cases remain unpaired
 * Octane executions that the parity harness inventories exactly.
 */
import { describe, expect, it } from 'vitest';
import { createLog, flushEffects, mount } from '../../../octane/tests/_helpers';
import { useGSAP } from '@octanejs/gsap';
import type { UseGSAPReturn } from '@octanejs/gsap';
import { GSAPProbe } from '../_fixtures/app.tsrx';

describe('adapted parity: useGSAP lifecycle', function adaptedLifecycle() {
	it('reverts before dependency updates when revertOnUpdate is enabled', function revertOnUpdate() {
		const log = createLog();
		let api: UseGSAPReturn | undefined;
		function capture(value: UseGSAPReturn) {
			api = value;
		}
		const root = mount(GSAPProbe, {
			value: 'one',
			log: log.push,
			capture,
			revertOnUpdate: true,
		});

		flushEffects();
		expect(log.drain()).toEqual(['effect:one:1', 'safe:one']);
		const firstContext = api?.context;
		const firstContextSafe = api?.contextSafe;

		root.update(GSAPProbe, {
			value: 'two',
			log: log.push,
			capture,
			revertOnUpdate: true,
		});
		flushEffects();
		expect(log.drain()).toEqual(['cleanup:one', 'effect:two:1', 'safe:two']);
		expect(api?.context).toBe(firstContext);
		expect(api?.contextSafe).toBe(firstContextSafe);

		root.unmount();
		expect(log.drain()).toEqual(['cleanup:two']);
	});

	it('defers context cleanup until unmount when revertOnUpdate is disabled', function deferredCleanup() {
		const log = createLog();
		function capture(_value: UseGSAPReturn) {}
		const root = mount(GSAPProbe, { value: 'one', log: log.push, capture });

		flushEffects();
		expect(log.drain()).toEqual(['effect:one:1', 'safe:one']);

		root.update(GSAPProbe, { value: 'two', log: log.push, capture });
		flushEffects();
		expect(log.drain()).toEqual(['effect:two:1', 'safe:two']);

		root.unmount();
		expect(log.drain()).toEqual(['cleanup:one', 'cleanup:two']);
	});

	it('exposes the upstream static registration contract', function staticContract() {
		expect(useGSAP.headless).toBe(true);
		expect(typeof useGSAP.register).toBe('function');
	});
});
