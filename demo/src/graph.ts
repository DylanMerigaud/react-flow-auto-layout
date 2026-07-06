import { type Edge, type Node } from "@xyflow/react";

/** Each node carries a title and an optional longer body, so heights VARY. */
export type CardData = {
  title: string;
  body?: string;
  tone?: "start" | "branch" | "join" | "end";
  /** The card whose size changes on the loop; highlighted so the eye follows it. */
  live?: boolean;
};

// A workflow-shaped DAG: a linear intro, a three-way fan-out, then a join and a
// tail. The "Director approval" card is the one that changes size on a loop, so the
// layout has to recenter its neighbors and keep the chain straight, live.
export const baseNodes: Node<CardData>[] = [
  { id: "in", position: { x: 0, y: 0 }, data: { title: "Invoice received", tone: "start" } },
  {
    id: "extract",
    position: { x: 0, y: 0 },
    data: {
      title: "Extract line items",
      body: "Vision model reads the PDF into structured rows, totals, and tax.",
    },
  },
  { id: "match", position: { x: 0, y: 0 }, data: { title: "Match to PO" } },
  {
    id: "mgr",
    position: { x: 0, y: 0 },
    data: { title: "Manager approval", tone: "branch" },
  },
  {
    id: "dir",
    position: { x: 0, y: 0 },
    data: { title: "Director approval", tone: "branch" },
  },
  {
    id: "dept",
    position: { x: 0, y: 0 },
    data: { title: "Department review", tone: "branch" },
  },
  {
    id: "post",
    position: { x: 0, y: 0 },
    data: {
      title: "Post to ledger",
      body: "Only after every gate clears and a human confirms.",
      tone: "join",
    },
  },
  { id: "done", position: { x: 0, y: 0 }, data: { title: "Paid", tone: "end" } },
];

export const edges: Edge[] = [
  { id: "in-extract", source: "in", target: "extract" },
  { id: "extract-match", source: "extract", target: "match" },
  { id: "match-mgr", source: "match", target: "mgr" },
  { id: "match-dir", source: "match", target: "dir" },
  { id: "match-dept", source: "match", target: "dept" },
  { id: "mgr-post", source: "mgr", target: "post" },
  { id: "dir-post", source: "dir", target: "post" },
  { id: "dept-post", source: "dept", target: "post" },
  { id: "post-done", source: "post", target: "done" },
];

// The rotating body text for the "Director approval" card. Each step changes its
// height, which is what forces the live recentering. Empty string = a short card.
export const dirBodies: string[] = [
  "",
  "Required above $25k.",
  "Required above $25k. Routes to the cost-center owner, resolved to a real person from the org chart, with a note on why it triggered.",
  "Required above $25k. Routes to the cost-center owner.",
];
