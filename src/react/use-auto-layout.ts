import {
  type Edge,
  type FitViewOptions,
  type Node,
  type OnEdgesChange,
  type OnNodesChange,
  useEdgesState,
  useNodesInitialized,
  useNodesState,
  useReactFlow,
} from "@xyflow/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { layout } from "../layout";
import {
  DEFAULT_NODE_HEIGHT,
  DEFAULT_NODE_SEP,
  DEFAULT_NODE_WIDTH,
  DEFAULT_RANK_SEP,
} from "../types";

/**
 * A stable callback whose identity never changes but which always sees the latest
 * closure, the fix for the `useCallback` stale-closure churn. Inlined here so the
 * package has no extra runtime dependency.
 */
const useEventCallback = <
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- a generic callback needs `any` args/return for full flexibility
  T extends (...args: any[]) => any,
>(
  fn: T,
): T => {
  const ref = useRef<T>(fn);
  useLayoutEffect(() => {
    ref.current = fn;
  });
  const stable = (...args: Parameters<T>): ReturnType<T> =>
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- T's return is `any` by the generic constraint above
    ref.current(...args);
  // eslint-disable-next-line no-restricted-syntax, @typescript-eslint/no-unsafe-type-assertion -- generic wrapper to T: the call signature matches; T just can't be proven assignable
  return useRef<T>(stable as T).current;
};

export type UseAutoLayoutArgs<
  T extends Record<string, unknown> = Record<string, unknown>,
> = {
  /** The source nodes. Their positions are ignored and recomputed. */
  nodes: Node<T>[];
  /** The edges connecting them. */
  edges: Edge[];
  /** `false` lays out left to right (default); `true` top to bottom. */
  vertical?: boolean;
  /** Gap between siblings on the cross axis. Defaults to 40. */
  nodeSep?: number;
  /** Gap between ranks. Defaults to 110. */
  rankSep?: number;
  /** Width used when `sizeOf` returns nothing. Defaults to 244. */
  defaultWidth?: number;
  /** Height used when `sizeOf` returns nothing. Defaults to 80. */
  defaultHeight?: number;
  /**
   * The rendered size of a node, given the sizes React Flow has measured so far.
   * The default returns the measured size, falling back to the defaults, so you
   * usually do not need this. Override it to force widths (React Flow measures both,
   * but a caller may want fixed widths in TB mode).
   */
  sizeOf?: (
    node: Node<T>,
    measured: { width?: number; height?: number },
  ) => { width: number; height: number };
  /** Fit the view once after the initial layout and reveal. Defaults to true. */
  fitViewOnLayout?: boolean;
  /** Options forwarded to `fitView` for that initial fit. */
  fitViewOptions?: FitViewOptions<Node<T>>;
};

export type UseAutoLayoutResult<
  T extends Record<string, unknown> = Record<string, unknown>,
> = {
  /** Nodes to render. Hidden until measured, then positioned and revealed. */
  nodes: Node<T>[];
  /** Edges to render. */
  edges: Edge[];
  /** MUST be wired to `<ReactFlow onNodesChange={...} />`; this is what drives the
      measurement and re-layout. */
  onNodesChange: OnNodesChange<Node<T>>;
  /** Wire to `<ReactFlow onEdgesChange={...} />`. */
  onEdgesChange: OnEdgesChange<Edge>;
  /** True once the initial measured layout has been applied. */
  isLaidOut: boolean;
};

/**
 * Lay out a React Flow graph with {@link layout}, handling the measurement dance so
 * variable-size nodes center correctly: render the nodes hidden, let React Flow
 * measure them, lay out on the real sizes, then reveal. A later size change (a node
 * grows) triggers one silent re-layout so edges stay straight, without re-fitting
 * the view.
 *
 * Must be used inside a `<ReactFlowProvider>`. Wire the returned `onNodesChange` to
 * your `<ReactFlow>`, or measurements never flow back and the layout never runs.
 */
export const useAutoLayout = <
  T extends Record<string, unknown> = Record<string, unknown>,
>(
  args: UseAutoLayoutArgs<T>,
): UseAutoLayoutResult<T> => {
  const {
    nodes: sourceNodes,
    edges: sourceEdges,
    vertical = false,
    nodeSep = DEFAULT_NODE_SEP,
    rankSep = DEFAULT_RANK_SEP,
    defaultWidth = DEFAULT_NODE_WIDTH,
    defaultHeight = DEFAULT_NODE_HEIGHT,
    sizeOf,
    fitViewOnLayout = true,
    fitViewOptions,
  } = args;

  const { fitView } = useReactFlow<Node<T>>();

  // Controlled state with React Flow's own reducers. Wiring `onNodesChange` is what
  // lets the ResizeObserver's measurements flow back so `useNodesInitialized` flips
  // and the layout runs. Nodes start HIDDEN at their given position.
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<T>>(
    sourceNodes.map((n) => ({
      ...n,
      style: { ...n.style, visibility: "hidden" },
    })),
  );
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(sourceEdges);

  const [isLaidOut, setIsLaidOut] = useState(false);
  const [relayoutTick, setRelayoutTick] = useState(0);
  const initialized = useNodesInitialized();

  // The key identifying the current layout inputs; a change forces a fresh layout.
  // It encodes node ids, edge ENDPOINTS (not just the count, so a rewire is caught),
  // and every layout parameter (so changing spacing or direction re-lays-out).
  // JSON.stringify gives an unambiguous, delimiter-safe serialization.
  const graphKey = JSON.stringify([
    sourceNodes.map((n) => n.id),
    sourceEdges.map((e) => [e.source, e.target]),
    vertical,
    nodeSep,
    rankSep,
    defaultWidth,
    defaultHeight,
  ]);

  const laidOutFor = useRef<string>("");
  // The measured sizes the current layout used, so a later drift is detectable.
  const laidOutSizes = useRef<Map<string, { width: number; height: number }>>(
    new Map(),
  );
  // The latest measured size per node, read straight off `dimensions` events so it
  // is never stale. The layout reads its sizes from here.
  const liveSizes = useRef<Map<string, { width: number; height: number }>>(
    new Map(),
  );
  // True while the next layout run is a silent drift correction (reposition only).
  const driftRelayout = useRef(false);

  const sizeFor = useEventCallback(
    (n: Node<T>): { width: number; height: number } => {
      const measured: { width?: number; height?: number } =
        liveSizes.current.get(n.id) ?? {};
      if (sizeOf) return sizeOf(n, measured);
      return {
        width: measured.width ?? defaultWidth,
        height: measured.height ?? defaultHeight,
      };
    },
  );

  // Re-hide and force a fresh layout ONLY when the layout inputs actually change
  // (graphKey), not on every render. A consumer passing inline `nodes`/`edges`
  // arrays changes their reference each render; gating on graphKey (a ref compare)
  // instead of array identity is what stops a re-hide + relayout loop and its flicker.
  const resetFor = useRef<string>("");
  useEffect(() => {
    if (resetFor.current === graphKey) return;
    resetFor.current = graphKey;
    setNodes(
      sourceNodes.map((n) => ({
        ...n,
        style: { ...n.style, visibility: "hidden" },
      })),
    );
    setEdges(sourceEdges);
    laidOutFor.current = "";
    setIsLaidOut(false);
    // Deps are graphKey (not the arrays): the reset must fire on a real input change,
    // not on every render when a consumer passes inline arrays. The arrays are read
    // fresh inside. (This project's ESLint does not run react-hooks/exhaustive-deps,
    // which would otherwise flag this deliberate choice.)
  }, [graphKey, setNodes, setEdges]);

  // When the source nodes change WITHOUT a structural change (same graphKey, e.g. a
  // label or `data` update), merge the new data into the laid-out nodes in place,
  // keeping their computed position and visibility. This reflects content updates
  // without the re-hide + relayout that a structural change triggers.
  useEffect(() => {
    if (resetFor.current !== graphKey) return; // a structural reset handles that case
    const incoming = new Map(sourceNodes.map((n) => [n.id, n]));
    setNodes((cur) =>
      cur.map((n) => {
        const src = incoming.get(n.id);
        if (!src || (src.data === n.data && src.type === n.type)) return n;
        return { ...n, data: src.data, type: src.type };
      }),
    );
  }, [sourceNodes, graphKey, setNodes]);

  // Once measured, lay out on the real sizes, reveal, and fit. The ref guard makes
  // this run once per graph.
  useEffect(() => {
    if (!initialized || laidOutFor.current === graphKey) return;
    laidOutFor.current = graphKey;
    laidOutSizes.current = new Map(
      nodesRef.current.map((n) => [n.id, sizeFor(n)]),
    );
    const laid = layout(sourceNodes, sourceEdges, {
      sizeOf: sizeFor,
      vertical,
      nodeSep,
      rankSep,
      defaultWidth,
      defaultHeight,
    });
    const byId = new Map(laid.map((n) => [n.id, n.position]));
    setNodes((cur) =>
      cur.map((n) => {
        const pos = byId.get(n.id);
        return pos
          ? {
              ...n,
              position: pos,
              style: { ...n.style, visibility: "visible" },
            }
          : { ...n, style: { ...n.style, visibility: "visible" } };
      }),
    );
    setIsLaidOut(true);
    // A drift re-layout only nudges positions to straighten edges; it must NOT
    // re-fit the view.
    if (driftRelayout.current) {
      driftRelayout.current = false;
      return;
    }
    if (fitViewOnLayout) {
      requestAnimationFrame(() => {
        void fitView(fitViewOptions);
      });
    }
  }, [
    initialized,
    graphKey,
    sourceNodes,
    sourceEdges,
    setNodes,
    fitView,
    fitViewOnLayout,
    fitViewOptions,
    vertical,
    nodeSep,
    rankSep,
    defaultWidth,
    defaultHeight,
    sizeFor,
    relayoutTick,
  ]);

  // Re-layout when React Flow reports a node resized. It emits a `dimensions` change
  // carrying the new size; we record it and, if it differs from what the layout
  // used, run one more pass (positions only, no re-fit) so the node, and thus its
  // edges, re-align on the true size. Bounded: after it, the sizes match.
  const onNodesChangeWithRelayout: OnNodesChange<Node<T>> = useEventCallback(
    (changes) => {
      onNodesChange(changes);
      let resized = false;
      for (const c of changes) {
        if (c.type !== "dimensions" || !c.dimensions) continue;
        liveSizes.current.set(c.id, {
          width: c.dimensions.width,
          height: c.dimensions.height,
        });
        const used = laidOutSizes.current.get(c.id);
        if (
          used == null ||
          Math.abs(used.height - c.dimensions.height) > 1 ||
          Math.abs(used.width - c.dimensions.width) > 1
        )
          resized = true;
      }
      if (resized && laidOutFor.current === graphKey) {
        driftRelayout.current = true;
        laidOutFor.current = "";
        setRelayoutTick((t) => t + 1);
      }
    },
  );

  return {
    nodes,
    edges,
    onNodesChange: onNodesChangeWithRelayout,
    onEdgesChange,
    isLaidOut,
  };
};
