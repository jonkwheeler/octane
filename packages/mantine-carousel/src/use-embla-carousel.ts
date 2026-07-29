import EmblaCarousel, {
	type EmblaCarouselType,
	type EmblaOptionsType,
	type EmblaPluginType,
} from 'embla-carousel';
import { useEffect, useState } from 'octane';

export function useEmblaCarousel(options: EmblaOptionsType, plugins: EmblaPluginType[] = []) {
	const [element, setElement] = useState<HTMLElement | null>(null);
	const [api, setApi] = useState<EmblaCarouselType | undefined>();

	useEffect(() => {
		if (!element) return undefined;
		const instance = EmblaCarousel(element, options, plugins);
		setApi(instance);
		return () => {
			instance.destroy();
			setApi(undefined);
		};
	}, [element]);

	useEffect(() => {
		api?.reInit(options, plugins);
	}, [api, options, plugins]);

	return [setElement, api] as const;
}
