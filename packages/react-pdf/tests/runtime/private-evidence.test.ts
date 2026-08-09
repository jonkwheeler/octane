import { describe, expect, it, vi } from 'vitest';

import LinkService from '../../src/LinkService.js';
import Ref from '../../src/Ref.js';
import { setRef } from '../../src/refs.js';
import {
	convertDataUriParameterObject,
	dataURItoByteString,
	dataURItoBytes,
	isDataURI,
} from '../../src/utils.js';

describe('@octanejs/react-pdf private upstream evidence', () => {
	// @parity-case adapted:react-pdf-utils
	it('matches upstream data URI and source utilities', () => {
		expect(isDataURI('potato')).toBe(false);
		expect(isDataURI('data:,Hello%2C%20world%21')).toBe(true);
		expect(() => dataURItoByteString('potato')).toThrow('Invalid data URI');
		expect(dataURItoByteString('data:,Hello%2C%20world%21')).toBe('Hello, world!');
		expect(dataURItoByteString('data:text/plain;base64,SGVsbG8sIHdvcmxkIQ==')).toBe(
			'Hello, world!',
		);
		const dataUri = 'data:text/plain;base64,SGVsbG8sIHdvcmxkIQ==';
		const converted = convertDataUriParameterObject({
			url: dataUri,
			httpHeaders: { Authorization: 'Bearer token' },
		});
		expect(converted).toEqual({
			data: dataURItoBytes(dataUri),
			httpHeaders: { Authorization: 'Bearer token' },
		});
		expect('url' in converted).toBe(false);
	});

	// @parity-case adapted:react-pdf-refs
	it('sets callback, object, and nested refs', () => {
		const callback = vi.fn();
		const object = { current: null as HTMLDivElement | null };
		const element = {} as HTMLDivElement;
		setRef([callback, [object]], element);
		expect(callback).toHaveBeenCalledWith(element);
		expect(object.current).toBe(element);
		setRef([callback, object], null);
		expect(object.current).toBeNull();
	});

	// @parity-case adapted:react-pdf-ref
	it('preserves Ref number and generation values', () => {
		expect(new Ref({ num: 7, gen: 2 }).toString()).toBe('7R2');
		expect(new Ref({ num: 7, gen: 0 }).toString()).toBe('7R');
	});

	// @parity-case adapted:react-pdf-link-service
	it('preserves LinkService navigation and external link policy', async () => {
		const scrollPageIntoView = vi.fn();
		const service = new LinkService();
		service.setDocument({
			numPages: 3,
			getDestination: vi.fn(async () => [1]),
			getPageIndex: vi.fn(async () => 1),
		} as never);
		service.setViewer({ scrollPageIntoView });
		service.goToPage(2);
		await service.goToDestination('chapter');
		expect(scrollPageIntoView).toHaveBeenNthCalledWith(1, {
			pageIndex: 1,
			pageNumber: 2,
		});
		expect(scrollPageIntoView).toHaveBeenNthCalledWith(2, {
			dest: [1],
			pageIndex: 1,
			pageNumber: 2,
		});

		const link = document.createElement('a');
		service.addLinkAttributes(link, 'https://octanejs.com/', false);
		expect(link.rel).toBe('noopener noreferrer nofollow');
		service.setExternalLinkRel('noopener');
		service.setExternalLinkTarget('_self');
		service.addLinkAttributes(link, 'https://octanejs.com/', false);
		expect(link.rel).toBe('noopener');
		expect(link.target).toBe('_self');
	});
});
