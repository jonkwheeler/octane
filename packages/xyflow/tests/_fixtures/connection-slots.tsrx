import {
	ReactFlowProvider,
	useHandleConnections,
	useNodeConnections,
	type Edge,
	type Node,
} from '@octanejs/xyflow';

const nodes: Node[] = [
	{ id: 'connected', position: { x: 0, y: 0 }, data: {} },
	{ id: 'target', position: { x: 100, y: 0 }, data: {} },
	{ id: 'isolated', position: { x: 200, y: 0 }, data: {} },
];

const edges: Edge[] = [{ id: 'connected-target', source: 'connected', target: 'target' }];

function ConnectionCounts() {
	const connectedNode = useNodeConnections({ id: 'connected' });
	const isolatedNode = useNodeConnections({ id: 'isolated' });
	const connectedHandle = useHandleConnections({ nodeId: 'connected', type: 'source' });
	const isolatedHandle = useHandleConnections({ nodeId: 'isolated', type: 'source' });

	return (
		<div>
			<output data-testid="connected-node">{String(connectedNode.length) as string}</output>
			<output data-testid="isolated-node">{String(isolatedNode.length) as string}</output>
			<output data-testid="connected-handle">{String(connectedHandle.length) as string}</output>
			<output data-testid="isolated-handle">{String(isolatedHandle.length) as string}</output>
		</div>
	);
}

export function ConnectionSlotProbe() {
	return (
		<ReactFlowProvider initialNodes={nodes} initialEdges={edges}>
			<ConnectionCounts />
		</ReactFlowProvider>
	);
}
