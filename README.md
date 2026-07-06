<div align="center">

# react-flow-auto-layout

**Auto layout for [React Flow](https://reactflow.dev), built on [dagre](https://github.com/dagrejs/dagre).**
The one that handles variable-size nodes: true bounding-box centering and straight linear edges, no kinks.

[![CI](https://github.com/DylanMerigaud/react-flow-auto-layout/actions/workflows/ci.yml/badge.svg)](https://github.com/DylanMerigaud/react-flow-auto-layout/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/react-flow-auto-layout?color=cb3837&logo=npm)](https://www.npmjs.com/package/react-flow-auto-layout)
[![npm bundle size](https://img.shields.io/bundlephobia/minzip/react-flow-auto-layout)](https://bundlephobia.com/package/react-flow-auto-layout)
[![types](https://img.shields.io/npm/types/react-flow-auto-layout)](https://www.npmjs.com/package/react-flow-auto-layout)
[![license](https://img.shields.io/npm/l/react-flow-auto-layout?color=blue)](./LICENSE)

### ▶︎ [Live demo: the same graph, plain dagre vs. this library](https://react-flow-auto-layout-ecru.vercel.app)

</div>

<!-- TODO: before/after GIF here (dagre kinked + off-center vs. this: straight + centered) -->

```tsx
import { useAutoLayout } from "react-flow-auto-layout/react";

function Graph({ sourceNodes, sourceEdges }) {
  const { nodes, edges, onNodesChange, onEdgesChange } = useAutoLayout({
    nodes: sourceNodes,
    edges: sourceEdges,
  });

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
    />
  );
}
```

That is the whole thing. Your nodes render hidden, get measured, lay out on their real sizes, and reveal. No manual measurement dance, no fixed-height guessing.

## Why this exists

Dagre is the usual answer for laying out a React Flow graph, and for uniform boxes it is fine. Three things break the moment your nodes are real cards with variable content:

- **Variable-size nodes.** Dagre assumes fixed dimensions. A card with a two-line title is taller than its neighbor, and a naive pass does not account for it, so siblings sit misaligned and cards overlap.
- **Centering drifts.** Dagre centers a parent on its children's *barycenter* (the average of their centers). When siblings differ in size, that is not the visual middle. This library centers each parent on the true **bounding box** of its children, so it sits dead center.
- **Linear edges kink.** In a plain `A → B → C` chain, each node ends up at its own center, so the connector bends even though it is one straight line. This library **snaps single-in / single-out chains colinear**, so straight runs render straight ([xyflow/xyflow#3218](https://github.com/xyflow/xyflow/issues/3218)).

It also keeps **fan-out branches in your declared edge order** instead of letting dagre's crossing-minimisation reshuffle them.

## Features

- 🎯 **True bounding-box centering**, not dagre's drifting barycenter
- 📏 **Variable width and height** per node, from real measurements
- 📐 **Straight linear edges**, no kinks on `A → B → C` runs
- 🔀 **Fan-out in your edge order**, not reshuffled
- ↕️ **Left-to-right or top-to-bottom**, one flag
- 🪝 **A hook that does the measuring for you**, or a pure function if you would rather
- 🧊 **Zero runtime deps** of its own (dagre + React Flow are peers)
- 📦 **Dual ESM + CJS**, full types, tree-shakeable, `sideEffects: false`
- 🔒 **Strict TypeScript**, published with provenance

## Install

```bash
npm i react-flow-auto-layout
```

`@xyflow/react` and `dagre` are peer dependencies you already have with React Flow. `react` and `react-dom` are peers too, but only the `/react` hook needs them; the core function is framework-agnostic.

## Usage

### The hook (recommended)

`useAutoLayout` handles the measurement so variable-size nodes center correctly. Wire the returned `onNodesChange` to `<ReactFlow>`, or measurements never flow back and nothing lays out. Run it inside a `<ReactFlowProvider>`.

```tsx
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
} from "@xyflow/react";
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

export default function App(props) {
  return (
    <ReactFlowProvider>
      <Graph {...props} />
    </ReactFlowProvider>
  );
}
```

### The pure function

If you measure sizes yourself or run outside React, call `layout` directly. It is pure and deterministic: same graph in, same positions out.

```ts
import { layout } from "react-flow-auto-layout";

const positioned = layout(nodes, edges, {
  sizeOf: (node) => ({
    width: node.measured.width,
    height: node.measured.height,
  }),
  vertical: false,
});
```

## API

### `layout(nodes, edges, options?)`

Returns a new array of nodes with a computed `position`. Generic over the node data type.

| Option | Default | Description |
| --- | --- | --- |
| `sizeOf` | `{ width: 244, height: 80 }` | Per-node `{ width, height }`. Return the real measured size. In LR the height is the axis a parent centers on; in TB the width is. |
| `vertical` | `false` | `false` lays out left-to-right, `true` top-to-bottom. |
| `nodeSep` | `40` | Gap between siblings on the cross axis. |
| `rankSep` | `110` | Gap between ranks (columns in LR, rows in TB). |
| `defaultWidth` | `244` | Width used when `sizeOf` is omitted. |
| `defaultHeight` | `80` | Height used when `sizeOf` is omitted. |

Also exports `DEFAULT_NODE_WIDTH`, `DEFAULT_NODE_SEP`, `DEFAULT_RANK_SEP`.

### `useAutoLayout(args)`

From `react-flow-auto-layout/react`. Returns `{ nodes, edges, onNodesChange, onEdgesChange, isLaidOut }`. Takes the same layout options as above, plus:

| Option | Default | Description |
| --- | --- | --- |
| `fitViewOnLayout` | `true` | Fit the view once after the initial layout and reveal. |
| `fitViewOptions` | | Options forwarded to that `fitView`. |
| `sizeOf` | measured | Also receives the sizes React Flow has measured so far, so the default already uses real measurements. Override to force widths. |

## Comparison

| | react-flow-auto-layout | plain dagre | [`@jalez/...automated-layout`](https://www.npmjs.com/package/@jalez/react-flow-automated-layout) |
| --- | :---: | :---: | :---: |
| Variable-size centering | ✅ | ❌ | partial |
| Straight linear edges | ✅ | ❌ | ❌ |
| Declared fan-out order | ✅ | ❌ | ❌ |
| Handles measurement for you | ✅ | ❌ | ✅ |
| Pure function available | ✅ | ✅ | ❌ |
| Nested / subflow layout | ❌ | ❌ | ✅ |

If you need nested/subflow auto-layout, `@jalez/react-flow-automated-layout` is the one to reach for. This library is for misaligned, off-center, or kinked layouts on variable-size cards.

## Notes and edge cases

- Feed a **DAG**. Cycles are laid out (no infinite loop) but centering is undefined for them.
- **Multiple roots / disconnected components** are supported but not placed into separate lanes; `fitView` frames all of them.
- A node that is both a single-parent branch and a multi-parent join is centered on its parents and not reordered.
- **De-duplicate edges** and avoid self-loops; behavior with them is undefined.
- For the pure function without the hook, run it once with estimated sizes, then again with measured sizes, or the layout shifts when real sizes land. The hook does this for you.

## Contributing

Issues and PRs welcome. The gate is `pnpm verify` (format, typecheck, lint, knip, tests, build, publint, attw). Tests are deterministic and run on the pure `layout()` via `node:test`.

## Author

Built by Dylan Merigaud. [GitHub](https://github.com/DylanMerigaud) · [LinkedIn](https://www.linkedin.com/in/dylanmerigaud/)

Extracted from [ledgerloop](https://github.com/DylanMerigaud/ledgerloop), where it lays out procure-to-pay approval workflows.

## License

[MIT](./LICENSE)
