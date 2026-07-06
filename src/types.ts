import { type Node } from "@xyflow/react";

/** The default card width the layout falls back to when no size is supplied. */
export const DEFAULT_NODE_WIDTH = 244;
/** The default gap between siblings on the cross axis. */
export const DEFAULT_NODE_SEP = 40;
/** The default gap between ranks (columns in LR, rows in TB). */
export const DEFAULT_RANK_SEP = 110;

/**
 * Options for {@link layout}. Every field is optional, so `layout(nodes, edges)`
 * works out of the box with the defaults below.
 */
export type AutoLayoutOptions<
  T extends Record<string, unknown> = Record<string, unknown>,
> = {
  /**
   * The rendered size of a node. Return the REAL measured `{ width, height }` for
   * best results (that is the whole point: dagre assumes fixed dimensions, this
   * centers on the true bounding box). Omit it and every node is
   * `{ width: defaultWidth, height: defaultHeight }`.
   *
   * In LR (horizontal) layouts the height is the cross axis a parent centers on;
   * in TB (vertical) layouts the width is. Supply both so either orientation is
   * correct.
   */
  sizeOf?: (node: Node<T>) => { width: number; height: number };
  /** `false` lays out left to right (default); `true` lays out top to bottom. */
  vertical?: boolean;
  /** Gap between siblings on the cross axis. Defaults to {@link DEFAULT_NODE_SEP}. */
  nodeSep?: number;
  /** Gap between ranks. Defaults to {@link DEFAULT_RANK_SEP}. */
  rankSep?: number;
  /** Width used when `sizeOf` is omitted. Defaults to {@link DEFAULT_NODE_WIDTH}. */
  defaultWidth?: number;
  /** Height used when `sizeOf` is omitted. Defaults to 80. */
  defaultHeight?: number;
};
