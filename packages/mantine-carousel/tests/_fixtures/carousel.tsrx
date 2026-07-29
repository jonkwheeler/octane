import { MantineProvider } from '@octanejs/mantine-core';
import { Carousel } from '@octanejs/mantine-carousel';

export function CarouselApp() @{
	<MantineProvider>
		<Carousel withIndicators>
			<Carousel.Slide>First</Carousel.Slide>
			<Carousel.Slide>Second</Carousel.Slide>
		</Carousel>
	</MantineProvider>
}
