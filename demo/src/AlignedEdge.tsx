import {
  BaseEdge,
  getSmoothStepPath,
  Position,
  type EdgeProps,
} from "@xyflow/react";

// How far past the anchoring handle the shared elbow sits.
const ELBOW_OFFSET = 22;

type AlignedData = { anchor?: "source" | "target" };

/**
 * A smoothstep edge whose horizontal elbow is anchored to ONE end (the hub of the
 * fan-out or join), not to the midpoint between source and target. Every edge that
 * shares that hub then bends on the same line, regardless of how tall each other
 * card is, so a taller card no longer drags its connector out of line with its
 * siblings. `data.anchor` says which end is the hub: "source" for a fan-out (edges
 * leaving one node), "target" for a join (edges entering one node).
 *
 * Only the edge geometry changes; nodes and handles are untouched.
 */
export function AlignedEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  style,
  data,
}: EdgeProps) {
  const anchor = (data as AlignedData | undefined)?.anchor ?? "source";
  const vertical =
    sourcePosition === Position.Bottom || sourcePosition === Position.Top;

  // Pin the bend a fixed distance from the hub handle, on the travel axis.
  let centerX: number | undefined;
  let centerY: number | undefined;
  if (vertical) {
    centerY =
      anchor === "source" ? sourceY + ELBOW_OFFSET : targetY - ELBOW_OFFSET;
  } else {
    centerX =
      anchor === "source" ? sourceX + ELBOW_OFFSET : targetX - ELBOW_OFFSET;
  }

  const [path] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 6,
    ...(centerX !== undefined ? { centerX } : {}),
    ...(centerY !== undefined ? { centerY } : {}),
  });

  return <BaseEdge path={path} markerEnd={markerEnd} style={style} />;
}
