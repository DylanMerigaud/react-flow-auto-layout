import {
  BaseEdge,
  getSmoothStepPath,
  Position,
  type Edge,
  type EdgeProps,
} from "@xyflow/react";
import { type ReactElement } from "react";

/** How far past the anchoring handle the shared elbow sits, in pixels. */
const DEFAULT_ELBOW_OFFSET = 22;

/** Which end of the edge the elbow is pinned to. */
export type ElbowAnchor = "source" | "target";

/** The `data` an {@link AlignedStepEdge} reads. `withAlignedElbows` fills `anchor`. */
export type AlignedStepEdgeData = {
  anchor?: ElbowAnchor;
  elbowOffset?: number;
};

/**
 * A smooth STEP edge (right-angle elbows) whose elbow is pinned to ONE end, the hub
 * of a fan-out or join, instead of the midpoint between source and target. Every
 * edge that shares that hub then bends on the same line, so a bigger sibling node
 * does not drag its connector out of line with the others.
 *
 * `data.anchor` picks the hub: "source" for a fan-out (edges leaving one node),
 * "target" for a join (edges entering one node). {@link withAlignedElbows} sets it
 * for you. This only applies to step edges; bezier and straight edges have no elbow.
 *
 * Only the edge geometry changes; nodes and handles are untouched.
 */
export const AlignedStepEdge = ({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  style,
  data,
}: EdgeProps): ReactElement => {
  const d: AlignedStepEdgeData = data ?? {};
  const anchor: ElbowAnchor = d.anchor ?? "source";
  const offset = d.elbowOffset ?? DEFAULT_ELBOW_OFFSET;

  // The edge travels vertically when its handles are on the top/bottom, so the
  // elbow moves on Y; otherwise it moves on X.
  const vertical =
    sourcePosition === Position.Bottom || sourcePosition === Position.Top;

  let centerX: number | undefined;
  let centerY: number | undefined;
  if (vertical) {
    centerY = anchor === "source" ? sourceY + offset : targetY - offset;
  } else {
    centerX = anchor === "source" ? sourceX + offset : targetX - offset;
  }

  const [path] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 6,
    ...(centerX === undefined ? {} : { centerX }),
    ...(centerY === undefined ? {} : { centerY }),
  });

  return <BaseEdge path={path} markerEnd={markerEnd} style={style} />;
};

/**
 * Tag each edge with the elbow anchor {@link AlignedStepEdge} needs, inferred from
 * the graph: an edge whose SOURCE has two or more children is a fan-out (anchor the
 * elbow to the shared source); an edge whose TARGET has two or more parents is a
 * join (anchor to the shared target). A plain one-to-one edge keeps the source
 * anchor, which is a no-op for a straight run. Existing `data` is preserved.
 *
 * Pass the result as your `edges`, with `AlignedStepEdge` registered as the edge
 * type, so a fan-out's or join's elbows line up across variable-size nodes.
 */
export const withAlignedElbows = <E extends Edge = Edge>(edges: E[]): E[] => {
  const childCount = new Map<string, number>();
  const parentCount = new Map<string, number>();
  for (const e of edges) {
    childCount.set(e.source, (childCount.get(e.source) ?? 0) + 1);
    parentCount.set(e.target, (parentCount.get(e.target) ?? 0) + 1);
  }

  return edges.map((e) => {
    const isFanOut = (childCount.get(e.source) ?? 0) >= 2;
    const isJoin = (parentCount.get(e.target) ?? 0) >= 2;
    // Fan-out wins when an edge is both (its source hub is the one that spreads out).
    const anchor: ElbowAnchor = isFanOut
      ? "source"
      : isJoin
        ? "target"
        : "source";
    const prev: AlignedStepEdgeData =
      typeof e.data === "object" ? e.data : {};
    return { ...e, data: { ...prev, anchor } };
  });
};
