// Adapted side: @octanejs/visx PieProps compiled with tsrx-tsc.
// Proves OctaneNode (unknown) child/render-prop returns accept Octane renderables.
import type { PieProps } from '../../src/shape/shapes/Pie.tsrx';

type ChildrenRender = NonNullable<PieProps<number>['children']>;
type CentroidRender = NonNullable<PieProps<number>['centroid']>;

declare function acceptChildrenReturn(value: ReturnType<ChildrenRender>): void;
declare function acceptCentroidReturn(value: ReturnType<CentroidRender>): void;
declare const octaneRenderable: unknown;

function consumerTypeFixtures() {
	// 1. Pie children render-prop return accepts an Octane renderable.
	acceptChildrenReturn(octaneRenderable);

	// 2. Pie centroid return accepts an Octane renderable.
	acceptCentroidReturn(octaneRenderable);
}

void consumerTypeFixtures;
