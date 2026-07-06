import { type Edge, type Node } from "@xyflow/react";

/** Each node carries a title and an optional longer body, so heights VARY. */
export type CardData = {
  title: string;
  body?: string;
  tone?: "start" | "branch" | "join" | "end";
  /** The card whose size changes on the loop; highlighted so the eye follows it. */
  live?: boolean;
  /** Orientation, so the handles sit on the right edges (top/bottom vs left/right). */
  vertical?: boolean;
};

// A generic CI/CD-shaped pipeline: install, build, a parallel test fan-out, then a
// gate and a deploy. Recognizable to anyone, no domain knowledge needed. The number
// of test branches is adjustable at runtime (add/remove), and the "Unit tests" card
// grows and shrinks on a loop, so the layout has to recenter and stay straight live.

export type CardId =
  | "install"
  | "build"
  | "lint"
  | "unit"
  | "e2e"
  | "types"
  | "a11y"
  | "gate"
  | "deploy";

const card = (
  id: CardId,
  data: CardData,
): Node<CardData> => ({ id, position: { x: 0, y: 0 }, data });

// The full set of nodes. The fan-out branches (lint/unit/e2e/types/a11y) are added
// or removed at runtime; the spine (install, build, gate, deploy) is always present.
export const allNodes: Record<CardId, Node<CardData>> = {
  install: card("install", { title: "Install deps", tone: "start" }),
  build: card("build", {
    title: "Build",
    body: "Compile, bundle, and emit the dist artifacts.",
  }),
  lint: card("lint", { title: "Lint", tone: "branch" }),
  unit: card("unit", { title: "Unit tests", tone: "branch" }),
  e2e: card("e2e", { title: "E2E tests", tone: "branch" }),
  types: card("types", { title: "Typecheck", tone: "branch" }),
  a11y: card("a11y", { title: "A11y audit", tone: "branch" }),
  gate: card("gate", {
    title: "Merge gate",
    body: "All checks green before merge.",
    tone: "join",
  }),
  deploy: card("deploy", { title: "Deploy", tone: "end" }),
};

/** The fan-out branches in order; the demo shows the first `branchCount` of these. */
export const branchOrder: CardId[] = ["lint", "unit", "e2e", "types", "a11y"];

/** Build the node + edge set for a given number of parallel test branches. */
export function buildGraph(branchCount: number): {
  nodes: Node<CardData>[];
  edges: Edge[];
} {
  const branches = branchOrder.slice(0, branchCount);
  const nodes = [
    allNodes.install,
    allNodes.build,
    ...branches.map((id) => allNodes[id]),
    allNodes.gate,
    allNodes.deploy,
  ];
  const edges: Edge[] = [
    { id: "install-build", source: "install", target: "build" },
    ...branches.map((id) => ({ id: `build-${id}`, source: "build", target: id })),
    ...branches.map((id) => ({ id: `${id}-gate`, source: id, target: "gate" })),
    { id: "gate-deploy", source: "gate", target: "deploy" },
  ];
  return { nodes, edges };
}

// The rotating body text for the "Unit tests" card. Each step changes its height,
// which is what forces the live recentering. Empty string = a short card.
export const liveBodies: string[] = [
  "",
  "142 passing.",
  "142 passing across 18 files. Coverage 94%, no flakes, ran in 3.2s on the parallel runner.",
  "142 passing across 18 files. Coverage 94%.",
];

/** The card whose body cycles. */
export const liveCardId: CardId = "unit";
