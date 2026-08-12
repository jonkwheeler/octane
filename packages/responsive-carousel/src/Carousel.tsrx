import { useState, type OctaneNode } from 'octane';

export interface CarouselProps {
	children?: OctaneNode[] | OctaneNode;
	selectedItem?: number;
	onChange?: (index: number, item: OctaneNode) => void;
	showArrows?: boolean;
	showIndicators?: boolean;
	showStatus?: boolean;
	showThumbs?: boolean;
	infiniteLoop?: boolean;
	autoPlay?: boolean;
	interval?: number;
	className?: string;
	ariaLabel?: string;
}

export function Carousel(props: CarouselProps) @{
	const items =
		Array.isArray(props.children)
			? props.children
			: props.children == null
				? []
				: [props.children];
	const [internal, setInternal] = useState(props.selectedItem ?? 0);
	const selected = props.selectedItem ?? internal;
	const select = (next: number) => {
		const normalized =
			props.infiniteLoop
				? (next + items.length) % items.length
				: Math.max(0, Math.min(items.length - 1, next));
		setInternal(normalized);
		props.onChange?.(normalized, items[normalized]);
	};

	<div class={['carousel-root', props.className]} aria-label={props.ariaLabel}>
		<div class="carousel carousel-slider">
			<ul class="slider">
				@for (const item of items; key item) {
					<li
						class={['slide', item === items[selected] && 'selected']}
						aria-hidden={item !== items[selected]}
					>{item}</li>
				}
			</ul>
			@if (props.showArrows !== false) {
				<>
					<button
						type="button"
						class="control-arrow control-prev"
						aria-label="previous slide / item"
						onClick={() => select(selected - 1)}
					>previous</button>
					<button
						type="button"
						class="control-arrow control-next"
						aria-label="next slide / item"
						onClick={() => select(selected + 1)}
					>next</button>
				</>
			}
			@if (props.showIndicators !== false) {
				<ul class="control-dots">
					@for (const item of items; key item) {
						<li
							class={['dot', item === items[selected] && 'selected']}
							onClick={() => select(items.indexOf(item))}
						/>
					}
				</ul>
			}
		</div>
	</div>
}
