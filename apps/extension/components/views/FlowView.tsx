import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  type Edge,
  type Node,
} from '@xyflow/react';
import { useMemo } from 'react';
import { buildFlowGraph, type NavigationRecord, type RequestRecord } from '@webtrace/core';
import { FlowNodeCard, type FlowCardNode } from './FlowNodeCard';

const nodeTypes = { webtrace: FlowNodeCard };

export function FlowView({
  requests,
  navigations,
  totalRequests,
  onSelect,
}: {
  requests: RequestRecord[];
  navigations: NavigationRecord[];
  totalRequests: number;
  onSelect: (requestId: string) => void;
}) {
  const { nodes, edges, truncated } = useMemo(() => {
    const graph = buildFlowGraph(navigations, requests);
    const rfNodes: FlowCardNode[] = graph.nodes.map((n) => ({
      id: n.id,
      type: 'webtrace' as const,
      position: { x: n.x, y: n.y },
      data: {
        kind: n.data.kind,
        label: n.data.label,
        sublabel: n.data.sublabel,
        url: n.data.url,
        category: n.data.category,
        status: n.data.status,
        isError: n.data.isError,
        durationMs: n.data.durationMs,
        thirdParty: n.data.thirdParty,
        requestId: n.data.requestId,
      },
    }));
    const rfEdges: Edge[] = graph.edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label,
      type: 'smoothstep',
      animated: e.relation !== 'resource-of',
      style: {
        strokeDasharray: e.evidence === 'derived' ? '5 4' : undefined,
        strokeWidth: 1.4,
      },
      labelStyle: { fontSize: 9, fontFamily: 'monospace', fill: 'var(--wt-faint)' },
      labelBgStyle: { fill: 'var(--wt-surface)' },
    }));
    return { nodes: rfNodes, edges: rfEdges, truncated: graph.truncated };
  }, [requests, navigations]);

  return (
    <div className="relative h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.1, maxZoom: 1 }}
        minZoom={0.2}
        maxZoom={1.6}
        proOptions={{ hideAttribution: true }}
        onNodeClick={(_, node: Node) => {
          const requestId = (node.data as FlowCardNode['data']).requestId;
          if (requestId) onSelect(requestId);
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="var(--wt-line)" />
        <Controls showInteractive={false} position="bottom-right" />
      </ReactFlow>

      {truncated && (
        <div className="pointer-events-none absolute bottom-2 left-2 rounded-md border border-warn/40 bg-surface/90 px-2 py-1 text-[10px] text-warn">
          Showing the most recent 250 of {totalRequests} requests
        </div>
      )}
      <div className="pointer-events-none absolute left-2 top-2 flex flex-col gap-1 rounded-md border border-line bg-surface/90 px-2 py-1 text-[9px] text-faint">
        <span><span className="mr-1 inline-block h-px w-4 bg-line align-middle" />observed</span>
        <span><span className="mr-1 inline-block h-px w-4 border-t border-dashed border-faint align-middle" />derived (inferred)</span>
      </div>
    </div>
  );
}
