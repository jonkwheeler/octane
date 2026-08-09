import { describe, expect, it } from 'vitest';
import {
	getChildMapping,
	mergeChildMappings,
	type ChildMapping,
} from '../../src/utils/ChildMapping.ts';
import { mappingChildren } from './_fixtures.tsrx';

function mapping(values: Record<string, boolean>): ChildMapping {
	return values as unknown as ChildMapping;
}

describe('ChildMapping', function childMappingSuite() {
	// Per upstream/test/ChildMapping-test.js:10.
	it('should support getChildMapping', function childMapping() {
		const children = mappingChildren();
		const result = getChildMapping(children);
		const mapped = Object.values(result);
		expect(mapped).toHaveLength(2);
		expect(mapped[0].props.children).toBeDefined();
		expect(mapped[1].props.children).toBe('foo');
	});

	// Per upstream/test/ChildMapping-test.js:33.
	it('should support mergeChildMappings for adding keys', function addKeys() {
		const previous = mapping({ one: true, two: true });
		const next = mapping({ one: true, two: true, three: true });
		expect(mergeChildMappings(previous, next)).toEqual(next);
	});

	// Per upstream/test/ChildMapping-test.js:50.
	it('should support mergeChildMappings for removing keys', function removeKeys() {
		const previous = mapping({ one: true, two: true, three: true });
		const next = mapping({ one: true, two: true });
		expect(mergeChildMappings(previous, next)).toEqual(previous);
	});

	// Per upstream/test/ChildMapping-test.js:67.
	it('should support mergeChildMappings for adding and removing', function addAndRemoveKeys() {
		const previous = mapping({ one: true, two: true, three: true });
		const next = mapping({ one: true, two: true, four: true });
		expect(mergeChildMappings(previous, next)).toEqual(
			mapping({ one: true, two: true, three: true, four: true }),
		);
	});

	// Per upstream/test/ChildMapping-test.js:86.
	it('should reconcile overlapping insertions and deletions', function reconcileKeys() {
		const previous = mapping({ one: true, two: true, four: true, five: true });
		const next = mapping({ one: true, two: true, three: true, five: true });
		expect(mergeChildMappings(previous, next)).toEqual(
			mapping({ one: true, two: true, three: true, four: true, five: true }),
		);
	});

	// Per upstream/test/ChildMapping-test.js:108.
	it('should support mergeChildMappings with undefined input', function undefinedMappings() {
		const previous = mapping({ one: true, two: true });
		expect(mergeChildMappings(previous, undefined)).toEqual(previous);
		const next = mapping({ three: true, four: true });
		expect(mergeChildMappings(undefined, next)).toEqual(next);
	});
});
