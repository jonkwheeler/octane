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

type RenderResult = {
	observation: Observation;
	apiDefined: boolean[];
};

type ApiProbe = { current: boolean };

function ReactCarousel({
	options,
	plugins = [],
	attached = true,
	replacement = false,
	apiProbe,
}: ReactHarnessProps & {
	apiProbe: ApiProbe;
}) {
	const [viewportRef, emblaApi] = useEmblaCarouselReact(options, plugins);
	apiProbe.current = emblaApi !== undefined;
	const slides = React.createElement(
		'div',
		null,
		React.createElement('div', null, 'One'),
		React.createElement('div', null, 'Two'),
	);
	const viewport = !attached
		? null
		: replacement
			? React.createElement('article', { ref: viewportRef, 'data-viewport': 'replacement' }, slides)
			: React.createElement('div', { ref: viewportRef, 'data-viewport': 'initial' }, slides);
	return React.createElement('section', { 'data-api': emblaApi ? 'ready' : 'pending' }, viewport);
}

async function renderReact(sequence: ReactHarnessProps[]): Promise<RenderResult> {
	const observation = beginObservation();
	const apiDefined: boolean[] = [];
	const apiProbe: ApiProbe = { current: false };
	const container = document.createElement('div');
	document.body.append(container);
	const root = createRoot(container);
	for (const props of sequence) {
		await act(function renderStep() {
			root.render(React.createElement(ReactCarousel, { ...props, apiProbe }));
		});
		apiDefined.push(apiProbe.current);
	}
	await act(function unmountStep() {
		root.unmount();
	});
	container.remove();
	return { observation, apiDefined };
}

function settleEffects(): void {
	flushEffects();
	flushEffects();
}

function harnessProps(
	props: ReactHarnessProps,
	onApi: (api: EmblaCarouselType | undefined) => void,
) {
	return {
		options: props.options,
		plugins: props.plugins ?? [],
		onApi,
		attached: props.attached ?? true,
		replacement: props.replacement ?? false,
	};
}

function readOctaneApiDefined(result: ReturnType<typeof mount>): boolean {
	return result.find('[data-api]').getAttribute('data-api') === 'ready';
}

function applyOctaneStep(
	result: ReturnType<typeof mount>,
	props: ReactHarnessProps,
	onApi: (api: EmblaCarouselType | undefined) => void,
): boolean {
	const next = harnessProps(props, onApi);
	result.update(CarouselHarness, next);
	settleEffects();
	// Same-props re-apply matches the adapted conformance harness: construction
	// commits in an effect, and the published tuple member is observed on the
	// following render.
	result.update(CarouselHarness, next);
	settleEffects();
	return readOctaneApiDefined(result);
}

function renderOctane(sequence: ReactHarnessProps[]): RenderResult {
	const observation = beginObservation();
	const apiDefined: boolean[] = [];
	const onApi = function onApi(_api: EmblaCarouselType | undefined) {};
	const first = sequence[0];
	const result = mount(CarouselHarness, harnessProps(first, onApi));
	settleEffects();
	apiDefined.push(applyOctaneStep(result, first, onApi));
	for (const props of sequence.slice(1)) {
		apiDefined.push(applyOctaneStep(result, props, onApi));
	}
	result.unmount();
	settleEffects();
	return { observation, apiDefined };
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

		expect(octane.observation).toEqual(react.observation);
		expect(octane.apiDefined).toEqual(react.apiDefined);
		expect(
			octane.apiDefined.every(function isDefined(value) {
				return value;
			}),
		).toBe(true);
		expect(octane.observation).toEqual({
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

		expect(octane.observation).toEqual(react.observation);
		expect(octane.apiDefined).toEqual(react.apiDefined);
		expect(octane.observation.constructs).toBe(1);
		expect(octane.observation.destroys).toBe(1);
		expect(octane.observation.reinitializations).toEqual([[{}, [changed]]]);
		expect(octane.observation.pluginsAtConstruct).toEqual([[first]]);
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

		expect(octane.observation).toEqual(react.observation);
		expect(octane.apiDefined).toEqual(react.apiDefined);
		expect(octane.apiDefined).toEqual([true, false, true]);
		expect(octane.observation).toEqual({
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

		expect(octane.observation).toEqual(react.observation);
		expect(octane.apiDefined).toEqual(react.apiDefined);
		expect(octane.apiDefined).toEqual([true]);
		expect(octane.observation).toEqual({
			constructs: 1,
			destroys: 1,
			reinitializations: [],
			pluginsAtConstruct: [[]],
			globalOptionsAtConstruct: [{ loop: true }],
		});
	});
});
