/** @jsxImportSource octane */
import * as Popperjs from '@popperjs/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ManagedPopperHarness } from '../runtime/_fixtures/Harness.tsrx';
import { createRootTracker, settle } from './_helpers';

const { tracked, cleanup } = createRootTracker();
afterEach(function cleanupManagerSuite() {
	cleanup();
	vi.restoreAllMocks();
});

// Ported from packages/react-popper/upstream/tag/src/Manager.test.js
describe('Manager component', function managerSuite() {
	it('renders the expected markup', function rendersExpectedMarkup() {
		const root = tracked(ManagedPopperHarness, {});
		settle();
		expect(root.find('#reference')).toBeInstanceOf(HTMLButtonElement);
		expect(root.find('#popper')).toBeInstanceOf(HTMLDivElement);
	});

	it('connects Popper and Reference', async function connectsPopperAndReference() {
		const spy = vi.spyOn(Popperjs, 'createPopper');
		tracked(ManagedPopperHarness, {});
		settle();
		await Promise.resolve();
		settle();
		expect(spy).toHaveBeenCalled();
		expect(spy.mock.calls[0][0]).toBeInstanceOf(HTMLButtonElement);
		expect(spy.mock.calls[0][1]).toBeInstanceOf(HTMLDivElement);
	});
});
