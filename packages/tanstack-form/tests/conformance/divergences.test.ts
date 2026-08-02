import { renderHook } from '@octanejs/testing-library';
import { describe, expect, it } from 'vitest';
import { useForm } from '../../src/index';
import {
	renderNativeEventForm,
	renderRegisteredFieldComponent,
} from '../_fixtures/divergences.tsrx';

describe('@octanejs/tanstack-form documented divergences', () => {
	// OCTANE DIVERGENCE[tanstack-form-id-lifecycle][adapted:tanstack-form-id-lifecycle]
	// @parity-case adapted:tanstack-form-id-lifecycle
	it('keeps the generated form identity stable across rerenders', () => {
		const { result, rerender } = renderHook(() => useForm({ defaultValues: { name: '' } }));
		const initial = result.current.formId;
		rerender();
		expect(initial).toBeTruthy();
		expect(result.current.formId).toBe(initial);
	});

	// OCTANE DIVERGENCE[tanstack-form-function-components][adapted:tanstack-form-function-components]
	// @parity-case adapted:tanstack-form-function-components
	it('registers and renders callable Octane field components', () => {
		expect(renderRegisteredFieldComponent()).toHaveValue('Ada');
	});

	// OCTANE DIVERGENCE[tanstack-form-native-events][adapted:tanstack-form-native-event]
	// @parity-case adapted:tanstack-form-native-event
	it('receives the native input event while updating field state', () => {
		const { input, observedEvent } = renderNativeEventForm();
		expect(observedEvent).toBeInstanceOf(Event);
		expect('nativeEvent' in observedEvent!).toBe(false);
		expect(input).toHaveValue('Grace');
	});
});
