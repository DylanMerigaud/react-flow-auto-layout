import {
  Background,
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useNodesInitialized,
  useReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import dagre from "dagre";
import { useEffect } from "react";
import { useAutoLayout } from "react-flow-auto-layout/react";

import { CardNode } from "./CardNode";
import { edges, nodes, type CardData } from "./graph";

const nodeTypes = { card: CardNode };
const typed = nodes.map((n) => ({ ...n, type: "card" }));

const flowProps = {
  nodeTypes,
  nodesDraggable: false,
  nodesConnectable: false,
  edgesFocusable: false,
  fitView: true,
  minZoom: 0.3,
  maxZoom: 1.5,
  proOptions: { hideAttribution: true },
} as const;

/**
 * BEFORE: the naive dagre pass everyone writes first. It assumes a fixed node
 * height (72), so tall cards overlap or push neighbors, parents center on the
 * barycenter (off), and linear chains kink. This is the problem.
 */
function naiveDagre(ns: Node<CardData>[], es: Edge[]): Node<CardData>[] {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "LR", nodesep: 40, ranksep: 110 });
  g.setDefaultEdgeLabel(() => ({}));
  for (const n of ns) g.setNode(n.id, { width: 244, height: 72 });
  for (const e of es) g.setEdge(e.source, e.target);
  dagre.layout(g);
  return ns.map((n) => {
    const p = g.node(n.id);
    return { ...n, position: { x: p.x - 244 / 2, y: p.y - 72 / 2 } };
  });
}

function BeforeInner() {
  const [rfNodes, setNodes, onNodesChange] = useNodesState<Node<CardData>>(
    typed.map((n) => ({ ...n, style: { visibility: "hidden" } })),
  );
  const initialized = useNodesInitialized();
  const { fitView } = useReactFlow();
  useEffect(() => {
    if (!initialized) return;
    const laid = naiveDagre(typed, edges);
    const byId = new Map(laid.map((n) => [n.id, n.position]));
    setNodes((cur) =>
      cur.map((n) => ({
        ...n,
        position: byId.get(n.id) ?? n.position,
        style: { visibility: "visible" },
      })),
    );
    requestAnimationFrame(() => void fitView());
  }, [initialized, setNodes, fitView]);
  return (
    <ReactFlow nodes={rfNodes} edges={edges} onNodesChange={onNodesChange} {...flowProps}>
      <Background gap={18} color="#E2E8F0" />
    </ReactFlow>
  );
}

function AfterInner() {
  const { nodes: rfNodes, edges: rfEdges, onNodesChange, onEdgesChange } =
    useAutoLayout<CardData>({ nodes: typed, edges });
  return (
    <ReactFlow
      nodes={rfNodes}
      edges={rfEdges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      {...flowProps}
    >
      <Background gap={18} color="#E2E8F0" />
    </ReactFlow>
  );
}

export function BeforePanel() {
  return (
    <ReactFlowProvider>
      <BeforeInner />
    </ReactFlowProvider>
  );
}

export function AfterPanel() {
  return (
    <ReactFlowProvider>
      <AfterInner />
    </ReactFlowProvider>
  );
}
