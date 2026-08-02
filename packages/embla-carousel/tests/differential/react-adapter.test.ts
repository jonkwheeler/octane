import type { EmblaCarouselType, EmblaOptionsType, EmblaPluginType } from 'embla-carousel';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import useEmblaCarouselReact from 'embla-carousel-react';
import { describe, expect, it } from 'vitest';
import { flushEffects, mount } from '../_helpers';
import { CarouselHarness } from '../_fixtures/carousel.tsrx';
import { beginObservation, type Observation } from '../test-support/mock-embla';

function ReactCarousel({ options }: { options: EmblaOptionsType }) {
	const [viewportRef] = useEmblaCarouselReact(options);
	return React.createElement(
		'div',
		{ ref: viewportRef },
		React.createElement('div', null, React.createElement('div', null, 'One')),
	);
}

async function observeReact(): Promise<Observation> {
	const observation = beginObservation();
	const container = document.createElement('div');
	document.body.append(container);
	const root = createRoot(container);
	await act(() => root.render(React.createElement(ReactCarousel, { options: { loop: false } })));
	await act(() => root.render(React.createElement(ReactCarousel, { options: { loop: false } })));
	await act(() => root.render(React.createElement(ReactCarousel, { options: { loop: true } })));
	await act(() => root.unmount());
	container.remove();
	return observation;
}

function observeOctane(): Observation {
	const observation = beginObservation();
	const onApi = (_api: EmblaCarouselType | undefined) => {};
	const result = mount(CarouselHarness, {
		options: { loop: false },
		plugins: [],
		onApi,
	});
	flushEffects();
	result.update(CarouselHarness, { options: { loop: false }, plugins: [], onApi });
	flushEffects();
	result.update(CarouselHarness, { options: { loop: true }, plugins: [], onApi });
	flushEffects();
	result.unmount();
	flushEffects();
	return observation;
}

describe('@octanejs/embla-carousel React differential', () => {
	// @parity-case embla:differential:lifecycle
	it('matches the pinned React adapter lifecycle across attachment, updates, and cleanup', async () => {
		const react = await observeReact();
		const octane = observeOctane();

		expect(octane).toEqual(react);
		expect(octane).toEqual({
			constructs: 1,
			destroys: 1,
			reinitializations: [[{ loop: true }, []]],
		});
	});
});
