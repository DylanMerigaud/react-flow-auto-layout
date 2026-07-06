import {
  Background,
  ReactFlow,
  ReactFlowProvider,
  type Node,
} from "@xyflow/react";
import { useEffect, useMemo, useState } from "react";
import { useAutoLayout } from "react-flow-auto-layout/react";

import { CardNode } from "./CardNode";
import { baseNodes, dirBodies, edges, type CardData } from "./graph";

const nodeTypes = { card: CardNode };

function Inner() {
  // Rotate the "Director approval" body on a loop; its height changes, which is
  // what makes the layout recenter everything and keep the chains straight, live.
  const [step, setStep] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setStep((s) => (s + 1) % dirBodies.length), 2200);
    return () => clearInterval(id);
  }, []);

  const nodes = useMemo<Node<CardData>[]>(
    () =>
      baseNodes.map((n) =>
        n.id === "dir"
          ? { ...n, type: "card", data: { ...n.data, body: dirBodies[step], live: true } }
          : { ...n, type: "card" },
      ),
    [step],
  );

  const { nodes: rfNodes, edges: rfEdges, onNodesChange, onEdgesChange } =
    useAutoLayout<CardData>({ nodes, edges });

  return (
    <ReactFlow
      nodes={rfNodes}
      edges={rfEdges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      nodesDraggable={false}
      nodesConnectable={false}
      edgesFocusable={false}
      fitView
      fitViewOptions={{ padding: 0.18 }}
      minZoom={0.3}
      maxZoom={1.5}
      proOptions={{ hideAttribution: true }}
    >
      <Background gap={20} size={1.5} color="#E2E8F0" />
    </ReactFlow>
  );
}

export function LiveGraph() {
  return (
    <ReactFlowProvider>
      <Inner />
    </ReactFlowProvider>
  );
}
