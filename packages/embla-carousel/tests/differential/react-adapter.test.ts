import type { EmblaCarouselType, EmblaOptionsType, EmblaPluginType } from 'embla-carousel';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import useEmblaCarouselReact from 'embla-carousel-react';
import { beforeEach, describe, expect, it } from 'vitest';
import useEmblaCarousel from '@octanejs/embla-carousel';
import { flushEffects, mount } from '../_helpers';
import { CarouselHarness } from '../_fixtures/carousel.tsrx';
import { beginObservation, type Observation } from '../test-support/mock-embla';

type ReactHarnessProps = {
	options: EmblaOptionsType;
	plugins?: EmblaPluginType[];
	attached?: boolean;
	replacement?: boolean;
};

function ReactCarousel({
	options,
	plugins = [],
	attached = true,
	replacement = false,
}: ReactHarnessProps) {
	const [viewportRef] = useEmblaCarouselReact(options, plugins);
	if (!attached) return React.createElement('section', null);
	const slides = React.createElement(
		'div',
		null,
		React.createElement('div', null, 'One'),
		React.createElement('div', null, 'Two'),
	);
	if (replacement) {
		return React.createElement(
			'article',
			{ ref: viewportRef, 'data-viewport': 'replacement' },
			slides,
		);
	}
	return React.createElement('div', { ref: viewportRef, 'data-viewport': 'initial' }, slides);
}

async function renderReact(sequence: ReactHarnessProps[]): Promise<Observation> {
	const observation = beginObservation();
	const container = document.createElement('div');
	document.body.append(container);
	const root = createRoot(container);
	for (const props of sequence) {
		await act(function renderStep() {
			root.render(React.createElement(ReactCarousel, props));
		});
	}
	await act(function unmountStep() {
		root.unmount();
	});
	container.remove();
	return observation;
}

function renderOctane(sequence: ReactHarnessProps[]): Observation {
	const observation = beginObservation();
	const onApi = function onApi(_api: EmblaCarouselType | undefined) {};
	const first = sequence[0];
	const result = mount(CarouselHarness, {
		options: first.options,
		plugins: first.plugins ?? [],
		onApi,
		attached: first.attached ?? true,
		replacement: first.replacement ?? false,
	});
	flushEffects();
	for (const props of sequence.slice(1)) {
		result.update(CarouselHarness, {
			options: props.options,
			plugins: props.plugins ?? [],
			onApi,
			attached: props.attached ?? true,
			replacement: props.replacement ?? false,
		});
		flushEffects();
	}
	result.unmount();
	flushEffects();
	return observation;
}

function plugin(delay: number): EmblaPluginType {
	return {
		name: 'autoplay',
		options: { delay },
		init: function init() {},
		destroy: function destroy() {},
	} as EmblaPluginType;
}

beforeEach(function resetGlobals() {
	useEmblaCarousel.globalOptions = undefined;
	useEmblaCarouselReact.globalOptions = undefined;
});

describe('@octanejs/embla-carousel React differential', () => {
	// @parity-case embla:differential:lifecycle
	it('matches the pinned React adapter lifecycle across attachment, updates, and cleanup', async () => {
		const sequence = [
			{ options: { loop: false } },
			{ options: { loop: false } },
			{ options: { loop: true } },
		];
		const react = await renderReact(sequence);
		const octane = renderOctane(sequence);

		expect(octane).toEqual(react);
		expect(octane).toEqual({
			constructs: 1,
			destroys: 1,
			reinitializations: [[{ loop: true }, []]],
			pluginsAtConstruct: [[]],
			globalOptionsAtConstruct: [undefined],
		});
	});

	// @parity-case embla:differential:plugins
	it('matches plugin bail-out and reinitialization against the pinned React adapter', async () => {
		const first = plugin(1000);
		const equivalent = plugin(1000);
		const changed = plugin(2000);
		const sequence = [
			{ options: {}, plugins: [first] },
			{ options: {}, plugins: [equivalent] },
			{ options: {}, plugins: [changed] },
		];
		const react = await renderReact(sequence);
		const octane = renderOctane(sequence);

		expect(octane).toEqual(react);
		expect(octane.constructs).toBe(1);
		expect(octane.destroys).toBe(1);
		expect(octane.reinitializations).toEqual([[{}, [changed]]]);
		expect(octane.pluginsAtConstruct).toEqual([[first]]);
	});

	// @parity-case embla:differential:detach-replace
	it('matches detach and replacement viewport construction against the pinned React adapter', async () => {
		const sequence = [
			{ options: {}, attached: true, replacement: false },
			{ options: {}, attached: false, replacement: false },
			{ options: {}, attached: true, replacement: true },
		];
		const react = await renderReact(sequence);
		const octane = renderOctane(sequence);

		expect(octane).toEqual(react);
		expect(octane).toEqual({
			constructs: 2,
			destroys: 2,
			reinitializations: [],
			pluginsAtConstruct: [[], []],
			globalOptionsAtConstruct: [undefined, undefined],
		});
	});

	// @parity-case embla:differential:globals
	it('matches global option application against the pinned React adapter', async () => {
		useEmblaCarousel.globalOptions = { loop: true };
		useEmblaCarouselReact.globalOptions = { loop: true };
		const sequence = [{ options: {} }];
		const react = await renderReact(sequence);
		const octane = renderOctane(sequence);

		expect(octane).toEqual(react);
		expect(octane).toEqual({
			constructs: 1,
			destroys: 1,
			reinitializations: [],
			pluginsAtConstruct: [[]],
			globalOptionsAtConstruct: [{ loop: true }],
		});
	});
});
