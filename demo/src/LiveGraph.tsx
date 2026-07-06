import {
  Background,
  MarkerType,
  ReactFlow,
  ReactFlowProvider,
  type Edge,
  type Node,
} from "@xyflow/react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlignedStepEdge,
  useAutoLayout,
  withAlignedElbows,
} from "react-flow-auto-layout/react";

import { CardNode } from "./CardNode";
import {
  branchOrder,
  buildGraph,
  liveBodies,
  liveCardId,
  type CardData,
} from "./graph";

const nodeTypes = { card: CardNode };
const edgeTypes = { aligned: AlignedStepEdge };

type EdgeKind = "smoothstep" | "bezier" | "straight";

type Settings = {
  vertical: boolean;
  edgeKind: EdgeKind;
  rankSep: number;
  nodeSep: number;
  branchCount: number;
};

// The inner flow. Keyed by direction/gaps/branchCount in the parent so a change
// remounts it and re-lays-out cleanly; the body-size cycle happens inside without a
// remount, exercising the hook's live drift recentering.
function Flow({ settings, bodyStep }: { settings: Settings; bodyStep: number }) {
  const { vertical, edgeKind, rankSep, nodeSep, branchCount } = settings;

  const { nodes: baseNodes, edges: baseEdges } = useMemo(
    () => buildGraph(branchCount),
    [branchCount],
  );

  const nodes = useMemo<Node<CardData>[]>(
    () =>
      baseNodes.map((n) =>
        n.id === liveCardId
          ? {
              ...n,
              type: "card",
              data: { ...n.data, body: liveBodies[bodyStep], live: true, vertical },
            }
          : { ...n, type: "card", data: { ...n.data, vertical } },
      ),
    [baseNodes, bodyStep, vertical],
  );

  const edges = useMemo<Edge[]>(() => {
    // "smoothstep" uses the aligned step edge (elbows anchored to the fan-out/join
    // hub so they line up across variable-size cards); the others are stock.
    // withAlignedElbows tags each edge's anchor from the graph automatically.
    const base =
      edgeKind === "smoothstep" ? withAlignedElbows(baseEdges) : baseEdges;
    return base.map((e) => ({
      ...e,
      type:
        edgeKind === "smoothstep"
          ? "aligned"
          : edgeKind === "bezier"
            ? "default"
            : edgeKind,
      markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
    }));
  }, [baseEdges, edgeKind]);

  const {
    nodes: rfNodes,
    edges: rfEdges,
    onNodesChange,
    onEdgesChange,
  } = useAutoLayout<CardData>({ nodes, edges, vertical, rankSep, nodeSep });

  return (
    <ReactFlow
      nodes={rfNodes}
      edges={rfEdges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      nodesDraggable={false}
      nodesConnectable={false}
      edgesFocusable={false}
      fitView
      fitViewOptions={{ padding: 0.16 }}
      minZoom={0.3}
      maxZoom={1.5}
      proOptions={{ hideAttribution: true }}
    >
      <Background gap={20} size={1.5} color="#E2E8F0" />
    </ReactFlow>
  );
}

const RANK_MIN = 40;
const RANK_MAX = 220;
const NODE_MIN = 16;
const NODE_MAX = 120;

export function LiveGraph() {
  const [settings, setSettings] = useState<Settings>({
    vertical: false,
    edgeKind: "smoothstep",
    rankSep: 110,
    nodeSep: 40,
    branchCount: 3,
  });

  // Auto-cycle the live card's body, PAUSED for a few seconds after any interaction
  // so the two motions never fight.
  const [bodyStep, setBodyStep] = useState(0);
  const pausedUntil = useRef(0);
  useEffect(() => {
    const id = setInterval(() => {
      if (Date.now() < pausedUntil.current) return;
      setBodyStep((s) => (s + 1) % liveBodies.length);
    }, 2000);
    return () => clearInterval(id);
  }, []);

  const change = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    pausedUntil.current = Date.now() + 4000;
    setSettings((s) => ({ ...s, [key]: value }));
  };

  // Remount the flow when structure/direction/gaps change so it re-lays-out cleanly.
  const flowKey = `${settings.vertical}-${settings.edgeKind}-${settings.rankSep}-${settings.nodeSep}-${settings.branchCount}`;

  const canAdd = settings.branchCount < branchOrder.length;
  const canRemove = settings.branchCount > 1;

  return (
    <div className="stage">
      <div className="controls">
        <div className="control">
          <span className="control-label">Direction</span>
          <div className="segmented">
            <button
              className={!settings.vertical ? "on" : ""}
              onClick={() => change("vertical", false)}
            >
              Left to right
            </button>
            <button
              className={settings.vertical ? "on" : ""}
              onClick={() => change("vertical", true)}
            >
              Top to bottom
            </button>
          </div>
        </div>

        <div className="control">
          <span className="control-label">Edge</span>
          <div className="segmented">
            {(["smoothstep", "bezier", "straight"] as const).map((k) => (
              <button
                key={k}
                className={settings.edgeKind === k ? "on" : ""}
                onClick={() => change("edgeKind", k)}
              >
                {k}
              </button>
            ))}
          </div>
        </div>

        <div className="control">
          <span className="control-label">
            Rank gap <b>{settings.rankSep}</b>
          </span>
          <input
            type="range"
            min={RANK_MIN}
            max={RANK_MAX}
            value={settings.rankSep}
            onChange={(e) => change("rankSep", Number(e.target.value))}
          />
        </div>

        <div className="control">
          <span className="control-label">
            Node gap <b>{settings.nodeSep}</b>
          </span>
          <input
            type="range"
            min={NODE_MIN}
            max={NODE_MAX}
            value={settings.nodeSep}
            onChange={(e) => change("nodeSep", Number(e.target.value))}
          />
        </div>

        <div className="control">
          <span className="control-label">
            Branches <b>{settings.branchCount}</b>
          </span>
          <div className="segmented">
            <button
              disabled={!canRemove}
              onClick={() => change("branchCount", settings.branchCount - 1)}
            >
              &minus;
            </button>
            <button
              disabled={!canAdd}
              onClick={() => change("branchCount", settings.branchCount + 1)}
            >
              +
            </button>
          </div>
        </div>
      </div>

      <div className="canvas">
        <ReactFlowProvider>
          <Flow key={flowKey} settings={settings} bodyStep={bodyStep} />
        </ReactFlowProvider>
      </div>
    </div>
  );
}
