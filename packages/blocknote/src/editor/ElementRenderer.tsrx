import { createPortal, flushSync, OctaneNode, Ref, useImperativeHandle, useState } from 'octane';

/**
 * A helper component to render a single element to a container so we can subsequently read the DOM / HTML contents
 *
 * This is useful so we can render arbitrary React elements (blocks) in the correct context (used by `ReactRenderUtil`)
 */
type ElementRendererHandle = (node: OctaneNode, container: HTMLElement) => void;

type ElementRendererProps = {
	ref?: Ref<ElementRendererHandle>;
};

export function ElementRenderer(props: ElementRendererProps) {
	const [singleRenderData, setSingleRenderData] = useState<
		{ node: OctaneNode; container: HTMLElement } | undefined
	>();

	useImperativeHandle(props.ref, function () {
		return function (node: OctaneNode, container: HTMLElement) {
			flushSync(function () {
				setSingleRenderData({ node, container });
			});

			// clear after it's been rendered to `container`
			setSingleRenderData(undefined);
		};
	}, []);

	return <>
		{singleRenderData && createPortal(singleRenderData.node, singleRenderData.container)}
	</>;
}
