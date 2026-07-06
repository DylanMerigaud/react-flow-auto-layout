# react-flow-auto-layout

Auto layout for [React Flow](https://reactflow.dev), built on [dagre](https://github.com/dagrejs/dagre), that handles the things a plain dagre pass gets wrong: **variable-size nodes**, **true centering**, and **straight linear edges**.

[![CI](https://github.com/DylanMerigaud/react-flow-auto-layout/actions/workflows/ci.yml/badge.svg)](https://github.com/DylanMerigaud/react-flow-auto-layout/actions/workflows/ci.yml) ![npm](https://img.shields.io/npm/v/react-flow-auto-layout) ![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6) ![license](https://img.shields.io/badge/license-MIT-blue)

<!-- TODO: before/after GIF here (dagre kinked + off-center vs. this: straight + centered) -->

## Why

Dagre is the usual answer for laying out a React Flow graph, and for uniform boxes it is fine. Three things break once your nodes are real cards:

1. **Variable-size nodes.** Dagre assumes fixed dimensions. A card with a two-line title is taller than its neighbor, and the layout does not account for it, so siblings sit misaligned.
2. **Centering drifts.** Dagre centers a parent on its children's *barycenter* (the average of their centers). When siblings differ in size that is not the visual middle. This library centers each parent on the true **bounding box** of its children (top of the topmost to bottom of the bottommost), so it sits dead center.
3. **Linear edges kink.** In a plain `A → B → C` chain, each node ends up at its own center, so the connector bends even though it is one straight line. This library **snaps single-in / single-out chains colinear**, so straight runs render straight.

It also keeps **fan-out branches in your declared edge order** instead of letting dagre's crossing-minimisation reshuffle them.

If you just need generic nested auto-layout, [`@jalez/react-flow-automated-layout`](https://www.npmjs.com/package/@jalez/react-flow-automated-layout) and the [official examples](https://reactflow.dev/examples/layout/auto-layout) are good. This library is the one to reach for when misaligned, off-center, or kinked layouts on variable-size cards are the specific problem.

## Install

```bash
npm i react-flow-auto-layout
# peers you already have with React Flow:
npm i @xyflow/react dagre
```

`react`, `react-dom`, `@xyflow/react`, and `dagre` are peer dependencies. `react` / `react-dom` are only needed for the `/react` hook, not the core function.

## Usage

### The hook (recommended)

`useAutoLayout` handles the measurement dance for you: it renders nodes hidden, lets React Flow measure their real size, lays out on those sizes, then reveals. A node that grows later triggers one silent re-layout so edges stay straight. Wire the returned `onNodesChange` to `<ReactFlow>`, or measurements never flow back.

```tsx
import { ReactFlow, ReactFlowProvider, Background } from "@xyflow/react";
import { useAutoLayout } from "react-flow-auto-layout/react";
import "@xyflow/react/dist/style.css";

const nodeTypes = { card: CardNode };

function Graph({ sourceNodes, sourceEdges }) {
  const { nodes, edges, onNodesChange, onEdgesChange } = useAutoLayout({
    nodes: sourceNodes,
    edges: sourceEdges,
    // vertical: true, // top-to-bottom instead of left-to-right
  });

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      fitView
    >
      <Background />
    </ReactFlow>
  );
}

// The hook must run inside a provider.
export default function App(props) {
  return (
    <ReactFlowProvider>
      <Graph {...props} />
    </ReactFlowProvider>
  );
}
```

### The pure function

If you measure sizes yourself (or run outside React), call `layout` directly. It is pure and deterministic: same graph in, same positions out.

```ts
import { layout } from "react-flow-auto-layout";

const positioned = layout(nodes, edges, {
  sizeOf: (node) => ({ width: node.measured.width, height: node.measured.height }),
  vertical: false,
});
```

## API

### `layout(nodes, edges, options?)`

Returns a new array of nodes with computed `position`. Generic over the node data type.

| Option | Default | Description |
| --- | --- | --- |
| `sizeOf` | `{ width: 244, height: 80 }` | Per-node `{ width, height }`. Return the real measured size. In LR the height is the axis a parent centers on; in TB the width is. |
| `vertical` | `false` | `false` lays out left-to-right, `true` top-to-bottom. |
| `nodeSep` | `40` | Gap between siblings on the cross axis. |
| `rankSep` | `110` | Gap between ranks (columns in LR, rows in TB). |
| `defaultWidth` | `244` | Width used when `sizeOf` is omitted. |
| `defaultHeight` | `80` | Height used when `sizeOf` is omitted. |

Also exports `DEFAULT_NODE_WIDTH`, `DEFAULT_NODE_SEP`, `DEFAULT_RANK_SEP`.

### `useAutoLayout(args)` (from `react-flow-auto-layout/react`)

Returns `{ nodes, edges, onNodesChange, onEdgesChange, isLaidOut }`. Same layout options as above, plus `fitViewOnLayout` (default `true`) and `fitViewOptions`. `sizeOf` here also receives the sizes React Flow has measured so far, so the default already uses real measurements.

## Notes and edge cases

- Feed a **DAG**. Cycles are laid out (no infinite loop) but centering is undefined for them.
- **Multiple roots / disconnected components** are supported but not placed into separate lanes; `fitView` frames all of them.
- A node that is both a single-parent branch and a multi-parent join is centered on its parents and not reordered.
- **De-duplicate edges** and avoid self-loops; behavior with them is undefined.
- For the pure function without the hook, run it once with estimated sizes, then again with measured sizes, or the layout shifts when real sizes land. The hook does this for you.

## Author

Dylan Merigaud — [GitHub](https://github.com/DylanMerigaud) · [LinkedIn](https://www.linkedin.com/in/dylanmerigaud/)

Extracted from [ledgerloop](https://github.com/DylanMerigaud/ledgerloop), where it lays out approval workflows.

## License

MIT
