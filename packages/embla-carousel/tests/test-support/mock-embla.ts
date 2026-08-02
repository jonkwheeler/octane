import type { EmblaOptionsType, EmblaPluginType } from 'embla-carousel';

export type Observation = {
	constructs: number;
	destroys: number;
	reinitializations: Array<[EmblaOptionsType, EmblaPluginType[]]>;
};

let current: Observation | undefined;

export function beginObservation(): Observation {
	current = { constructs: 0, destroys: 0, reinitializations: [] };
	return current;
}

const EmblaCarousel = Object.assign(
	(_viewport: HTMLElement, _options: EmblaOptionsType, _plugins: EmblaPluginType[]) => {
		if (!current) throw new Error('beginObservation() must run before carousel construction');
		const observation = current;
		observation.constructs += 1;
		return {
			destroy: () => (observation.destroys += 1),
			reInit: (options: EmblaOptionsType, plugins: EmblaPluginType[]) =>
				observation.reinitializations.push([options, plugins]),
		};
	},
	{ globalOptions: undefined as EmblaOptionsType | undefined },
);

export default EmblaCarousel;
