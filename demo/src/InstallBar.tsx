import { useState } from "react";

const PM = {
  npm: "npm i react-flow-auto-layout",
  pnpm: "pnpm add react-flow-auto-layout",
  yarn: "yarn add react-flow-auto-layout",
} as const;

type Manager = keyof typeof PM;

// The prompt a user pastes into Claude Code / Cursor to wire the hook in.
const AGENT_PROMPT = `Add react-flow-auto-layout to this project to auto-lay-out our React Flow graph.

1. Install it with the project's package manager, detected from the lockfile:
   pnpm-lock.yaml -> pnpm add react-flow-auto-layout, yarn.lock -> yarn add react-flow-auto-layout,
   package-lock.json -> npm i react-flow-auto-layout, bun.lockb -> bun add react-flow-auto-layout.
   It has peer deps @xyflow/react and dagre (and react), which a React Flow project already has.

2. In the component that renders <ReactFlow>, replace the manual node/edge state with the hook:

   import { useAutoLayout } from "react-flow-auto-layout/react";
   const { nodes, edges, onNodesChange, onEdgesChange } = useAutoLayout({
     nodes: sourceNodes, // positions are recomputed
     edges: sourceEdges,
     // vertical: true, // for a top-to-bottom layout
   });

   Pass nodes, edges, onNodesChange, and onEdgesChange to <ReactFlow>.

3. Two requirements: the hook must run inside a <ReactFlowProvider>, and onNodesChange MUST be
   wired to <ReactFlow onNodesChange={...} /> or the layout never runs (it needs the measurement events).

4. It measures real node sizes automatically, so custom nodes with variable height work with no extra
   config. Do not set positions on the source nodes; the hook computes them.`;

export function InstallBar() {
  const [pm, setPm] = useState<Manager>("npm");
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (text: string, label: string) => {
    void navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied((c) => (c === label ? null : c)), 1600);
  };

  return (
    <div className="installbar">
      <div className="install">
        <div className="pm-tabs">
          {(Object.keys(PM) as Manager[]).map((k) => (
            <button
              key={k}
              className={pm === k ? "on" : ""}
              onClick={() => setPm(k)}
            >
              {k}
            </button>
          ))}
        </div>
        <code className="install-cmd">{PM[pm]}</code>
        <button
          className="ghost-btn"
          onClick={() => copy(PM[pm], "install")}
          aria-label="Copy install command"
        >
          {copied === "install" ? "Copied" : "Copy"}
        </button>
      </div>

      <button
        className="prompt-btn"
        onClick={() => copy(AGENT_PROMPT, "prompt")}
      >
        {copied === "prompt" ? "Copied to clipboard" : "Copy prompt for your AI agent"}
      </button>
    </div>
  );
}
