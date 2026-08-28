import { Carousel } from '../../src/index';

export function CarouselChildrenFixture() @{
	<Carousel>
		<div data-slide="first">first</div>
		<div data-slide="second">second</div>
	</Carousel>
}

export function EmptyCarouselFixture(props: { onChange: (index: number) => void }) @{
	<Carousel infiniteLoop onChange={props.onChange} />
}
