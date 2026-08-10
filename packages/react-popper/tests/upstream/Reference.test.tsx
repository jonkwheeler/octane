/** @jsxImportSource octane */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	BareReferenceHarness,
	ManagedPopperHarness,
	ReferenceSetterSpyHarness,
} from '../runtime/_fixtures/Harness.tsrx';
import { createRootTracker, settle } from './_helpers';

const { tracked, cleanup } = createRootTracker();
afterEach(function cleanupReferenceSuite() {
	cleanup();
	vi.restoreAllMocks();
});

// Ported from packages/react-popper/upstream/tag/src/Reference.test.js
describe('Arrow component', function referenceSuite() {
	it('renders the expected markup', function rendersExpectedMarkup() {
		const root = tracked(ManagedPopperHarness, {});
		settle();
		expect(root.find('#reference')).toBeInstanceOf(HTMLButtonElement);
	});

	it('consumes the ManagerReferenceNodeSetterContext from Manager', function consumesManagerContext() {
		const setReferenceNode = vi.fn();
		tracked(ReferenceSetterSpyHarness, { setReferenceNode });
		settle();
		expect(setReferenceNode).toHaveBeenCalled();
	});

	it('warns when setReferenceNode is present', function warnsWhenPresent() {
		const error = vi.spyOn(console, 'error').mockImplementation(function noop() {});
		tracked(ManagedPopperHarness, {});
		settle();
		expect(error).not.toHaveBeenCalled();
	});

	it('does not warn when setReferenceNode is not present', function doesNotWarnWhenAbsent() {
		const error = vi.spyOn(console, 'error').mockImplementation(function noop() {});
		const innerRef = vi.fn();
		const root = tracked(BareReferenceHarness, { innerRef });
		settle();
		expect(innerRef).toHaveBeenCalledWith(root.find('#reference'));
		expect(error).toHaveBeenCalledWith(
			'Warning: `Reference` should not be used outside of a `Manager` component.',
		);
	});
});
