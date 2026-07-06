import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";

import { type CardData } from "./graph";

const toneColor: Record<NonNullable<CardData["tone"]>, string> = {
  start: "#4F46E5",
  branch: "#0891B2",
  join: "#7C3AED",
  end: "#059669",
};

/**
 * A variable-height card. React Flow measures its real size and the hook lays out
 * on that. The body text is what makes some cards much taller than others.
 */
export function CardNode({ data }: NodeProps<Node<CardData>>) {
  const accent = data.tone ? toneColor[data.tone] : "#64748B";
  return (
    <div
      style={{
        width: 244,
        boxSizing: "border-box",
        borderRadius: 10,
        border: data.live ? "1px solid #6366F1" : "1px solid #E2E8F0",
        borderLeft: `3px solid ${accent}`,
        background: "#fff",
        padding: "12px 14px",
        boxShadow: data.live
          ? "0 0 0 3px rgba(99,102,241,0.18), 0 4px 12px rgba(99,102,241,0.15)"
          : "0 1px 2px rgba(16,24,40,0.06)",
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
        transition: "box-shadow 0.3s ease",
      }}
    >
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <div style={{ fontSize: 14, fontWeight: 600, color: "#0F172A" }}>
        {data.title}
      </div>
      {data.body ? (
        <div style={{ marginTop: 6, fontSize: 12, lineHeight: 1.4, color: "#64748B" }}>
          {data.body}
        </div>
      ) : null}
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
    </div>
  );
}
