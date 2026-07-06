import { type Edge, type Node } from "@xyflow/react";

import { layout, type AutoLayoutOptions } from "../src/index";

/** A node payload carrying its own size, so `sizeOf` can read it in tests. */
export type Sized = { w: number; h: number };

/** Build a node with a size baked into its data. Position is ignored by layout. */
export const node = (id: string, w: number, h: number): Node<Sized> => ({
  id,
  position: { x: 0, y: 0 },
  data: { w, h },
});

export const edge = (source: string, target: string): Edge => ({
  id: `${source}->${target}`,
  source,
  target,
});

/** Run layout reading each node's size from its own data. */
export const run = (
  nodes: Node<Sized>[],
  edges: Edge[],
  options: Omit<AutoLayoutOptions<Sized>, "sizeOf"> = {},
): Map<string, { x: number; y: number; w: number; h: number }> => {
  const laid = layout(nodes, edges, {
    ...options,
    sizeOf: (n) => ({ width: n.data.w, height: n.data.h }),
  });
  const byId = new Map<string, { w: number; h: number }>(
    nodes.map((n) => [n.id, { w: n.data.w, h: n.data.h }]),
  );
  return new Map(
    laid.map((n) => {
      const s = byId.get(n.id)!;
      return [n.id, { x: n.position.x, y: n.position.y, w: s.w, h: s.h }];
    }),
  );
};

/** Center on the cross axis. LR (default): the Y center. TB: the X center. */
export const cross = (
  pos: { x: number; y: number; w: number; h: number },
  vertical = false,
): number => (vertical ? pos.x + pos.w / 2 : pos.y + pos.h / 2);

/** Assert two numbers are equal within a tiny epsilon (dagre uses floats). */
export const near = (a: number, b: number, eps = 0.5): boolean =>
  Math.abs(a - b) <= eps;
