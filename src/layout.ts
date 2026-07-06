import { type Node, type Edge } from "@xyflow/react";
import dagre from "dagre";

import {
  DEFAULT_NODE_HEIGHT,
  DEFAULT_NODE_SEP,
  DEFAULT_NODE_WIDTH,
  DEFAULT_RANK_SEP,
  type AutoLayoutOptions,
} from "./types";

/* ── layout ────────────────────────────────────────────────────────────────── */

/**
 * Lay a DAG out with dagre, then apply three passes dagre does not:
 *
 *  1. Bounding-box centering. Each parent sits on the true middle of its
 *     children's bounding box (top of the topmost child to bottom of the
 *     bottommost), not dagre's barycenter, which drifts when siblings differ in
 *     size (a tall two-line card next to a short one). Join nodes are centered on
 *     their parents the same way.
 *  2. Sibling order follows the declared edge order, not dagre's
 *     crossing-minimisation (which can reshuffle a fan-out).
 *  3. Straightened linear segments. A single in / single out chain A to B to C is
 *     snapped colinear so its connectors render straight instead of kinked.
 *
 * Node sizes come from `options.sizeOf` (return the REAL measured size for the
 * best result). The whole function is pure and deterministic: same graph in, same
 * positions out.
 */
export const layout = <
  T extends Record<string, unknown> = Record<string, unknown>,
>(
  nodes: Node<T>[],
  edges: Edge[],
  options: AutoLayoutOptions<T> = {},
): Node<T>[] => {
  const {
    sizeOf,
    vertical = false,
    nodeSep = DEFAULT_NODE_SEP,
    rankSep = DEFAULT_RANK_SEP,
    defaultWidth = DEFAULT_NODE_WIDTH,
    defaultHeight = DEFAULT_NODE_HEIGHT,
  } = options;

  // The rendered size per node. Heights (and widths) are VARIABLE, and guessing
  // them is what throws centering off, so a caller should pass real measured sizes
  // via `sizeOf`. Missing entries fall back to the defaults.
  const size = new Map<string, { width: number; height: number }>(
    nodes.map((n) => [
      n.id,
      sizeOf?.(n) ?? { width: defaultWidth, height: defaultHeight },
    ]),
  );
  const widthOf = (id: string): number => size.get(id)?.width ?? defaultWidth;
  const heightOf = (id: string): number =>
    size.get(id)?.height ?? defaultHeight;

  // Only edges whose BOTH endpoints are real nodes. A dangling edge (an endpoint
  // not in `nodes`, common when app state has nodes and edges briefly out of sync)
  // would otherwise make dagre create a phantom node with no coordinates, which the
  // centering passes then read and crash on.
  const present = new Set(nodes.map((n) => n.id));
  const realEdges = edges.filter(
    (e) => present.has(e.source) && present.has(e.target),
  );

  const g = new dagre.graphlib.Graph();
  g.setGraph({
    // Horizontal (LR) by default; vertical (TB) when asked, where a wide
    // left-to-right DAG cannot fit and each node stacks in its own row.
    rankdir: vertical ? "TB" : "LR",
    nodesep: nodeSep,
    ranksep: rankSep,
    ranker: "tight-tree",
  });
  g.setDefaultEdgeLabel(() => ({}));
  for (const n of nodes) {
    g.setNode(n.id, { width: widthOf(n.id), height: heightOf(n.id) });
  }
  for (const e of realEdges) g.setEdge(e.source, e.target);
  dagre.layout(g);

  // The CROSS axis is the one a parent is centered on, across its children: the
  // vertical axis when ranks flow left to right, the horizontal axis when top to
  // bottom. `rank` is the other axis (which column or row). We center and reorder
  // on the cross axis, so the same logic serves both orientations by swapping
  // which coordinate it reads.
  const crossOf = (id: string): number =>
    vertical ? g.node(id).x : g.node(id).y;
  const crossSizeOf = (id: string): number =>
    vertical ? widthOf(id) : heightOf(id);

  const cross = new Map<string, number>(); // node id to center on the cross axis
  for (const id of g.nodes()) cross.set(id, crossOf(id));
  const halfOf = (id: string): number => crossSizeOf(id) / 2;
  const boxMid = (ids: string[]): number => {
    const tops = ids.map((k) => (cross.get(k) ?? 0) - halfOf(k));
    const bots = ids.map((k) => (cross.get(k) ?? 0) + halfOf(k));
    return (Math.min(...tops) + Math.max(...bots)) / 2;
  };

  const childrenOf = new Map<string, string[]>();
  const parentsOf = new Map<string, string[]>();
  for (const e of realEdges) {
    childrenOf.set(e.source, [...(childrenOf.get(e.source) ?? []), e.target]);
    parentsOf.set(e.target, [...(parentsOf.get(e.target) ?? []), e.source]);
  }

  // SIBLING ORDER (along the cross axis) follows the declared edge order, NOT
  // dagre's crossing-minimisation (which can reshuffle). We keep the exact slots
  // dagre computed for a parent's children (so spacing and measured sizes are
  // respected), but RE-ASSIGN those slots to the children in edge order. Only for
  // siblings that belong to a single parent (true fan-out branches); a shared join
  // node is not reordered.
  for (const [, children] of childrenOf) {
    const branches = children.filter(
      (c) => (parentsOf.get(c) ?? []).length === 1,
    );
    if (branches.length < 2) continue;
    const slots = branches.map((c) => cross.get(c) ?? 0).sort((a, b) => a - b);
    branches.forEach((c, i) => cross.set(c, slots[i] ?? cross.get(c) ?? 0));
  }

  // Parents centered on their children (deepest rank first so children settle first).
  const rankOf = (id: string): number =>
    vertical ? g.node(id).y : g.node(id).x;
  for (const id of [...g.nodes()].sort((a, b) => rankOf(b) - rankOf(a))) {
    const kids = childrenOf.get(id) ?? [];
    if (kids.length >= 2) cross.set(id, boxMid(kids));
  }
  // Join nodes centered on their parents (shallowest rank first).
  for (const id of [...g.nodes()].sort((a, b) => rankOf(a) - rankOf(b))) {
    const parents = parentsOf.get(id) ?? [];
    if (parents.length >= 2) cross.set(id, boxMid(parents));
  }

  // STRAIGHTEN LINEAR SEGMENTS. The handle sits at a node's cross-axis CENTER; nodes
  // of different sizes get different centers, so a plain chain A to B to C (each a
  // single in / out) renders with a kinked connector even though it is one straight
  // line. Walk rank order and, for every straight segment (source has exactly one
  // child, target exactly one parent), snap the target's center onto the source's.
  // This makes a linear run perfectly colinear regardless of card sizes (the ONE
  // thing that made edges kink), while leaving fan-out branches and joins (2+ in or
  // out) untouched, since they are not straight segments. Deterministic: it depends
  // only on the graph shape.
  for (const id of [...g.nodes()].sort((a, b) => rankOf(a) - rankOf(b))) {
    const kids = childrenOf.get(id) ?? [];
    if (kids.length !== 1) continue; // source must fan out to exactly one node
    const kid = kids[0];
    if (kid === undefined) continue;
    if ((parentsOf.get(kid) ?? []).length !== 1) continue; // target: single parent
    // Don't move a target that is itself a fan-out parent: it was already centered
    // on its own children's bounding box, and snapping it onto the source would
    // override that (dragging it back to the barycenter this library exists to fix).
    if ((childrenOf.get(kid) ?? []).length >= 2) continue;
    cross.set(kid, cross.get(id) ?? crossOf(kid));
  }

  return nodes.map((n) => {
    const node = g.node(n.id);
    const c = cross.get(n.id) ?? crossOf(n.id);
    // dagre gives the center; React Flow positions by top-left. Map the cross-axis
    // center back to x (vertical) or y (horizontal); the rank axis is dagre's own.
    const x = vertical ? c - widthOf(n.id) / 2 : node.x - node.width / 2;
    const y = vertical ? node.y - node.height / 2 : c - halfOf(n.id);
    return { ...n, position: { x, y } };
  });
};
