import { type Edge, type Node } from "@xyflow/react";

/** Each node carries a title and an optional longer body, so heights VARY. */
export type CardData = {
  title: string;
  body?: string;
  tone?: "start" | "branch" | "join" | "end";
};

// A workflow-shaped DAG: a linear intro, a three-way fan-out with cards of very
// different heights, then a join and a tail. The height variety is the whole point:
// it is what makes a naive fixed-size dagre pass drift and kink.
export const nodes: Node<CardData>[] = [
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
    data: {
      title: "Director approval",
      body: "Required above $25k. Routes to the cost-center owner, resolved to a real person from the org chart.",
      tone: "branch",
    },
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
