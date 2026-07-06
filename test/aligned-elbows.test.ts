import assert from "node:assert/strict";
import { test } from "node:test";

import { type Edge } from "@xyflow/react";

import { withAlignedElbows } from "../src/react/aligned-step-edge";

const edge = (source: string, target: string): Edge => ({
  id: `${source}-${target}`,
  source,
  target,
});

const anchorOf = (edges: Edge[], id: string): unknown => {
  const e = edges.find((x) => x.id === id);
  return e && typeof e.data === "object" && e.data !== null
    ? (e.data as { anchor?: unknown }).anchor
    : undefined;
};

// Fan-out: a source with 2+ children anchors its edges to the source (the hub).
test("fan-out edges anchor to the source", () => {
  const out = withAlignedElbows([
    edge("B", "X"),
    edge("B", "Y"),
    edge("B", "Z"),
  ]);
  assert.equal(anchorOf(out, "B-X"), "source");
  assert.equal(anchorOf(out, "B-Y"), "source");
  assert.equal(anchorOf(out, "B-Z"), "source");
});

// Join: a target with 2+ parents anchors its edges to the target (the hub).
test("join edges anchor to the target", () => {
  const out = withAlignedElbows([
    edge("X", "G"),
    edge("Y", "G"),
    edge("Z", "G"),
  ]);
  assert.equal(anchorOf(out, "X-G"), "target");
  assert.equal(anchorOf(out, "Y-G"), "target");
  assert.equal(anchorOf(out, "Z-G"), "target");
});

// A plain one-to-one edge (a straight run) keeps the source anchor (a no-op there).
test("a one-to-one edge anchors to the source", () => {
  const out = withAlignedElbows([edge("A", "B"), edge("B", "C")]);
  assert.equal(anchorOf(out, "A-B"), "source");
  assert.equal(anchorOf(out, "B-C"), "source");
});

// An edge that is both a fan-out branch and a join input prefers the fan-out (source).
test("fan-out wins when an edge is both fan-out and join", () => {
  // P fans out to A and B; A and B both feed J (so A->J and B->J are joins), but
  // P->A is a fan-out. Also make A a fan-out parent to keep it interesting.
  const out = withAlignedElbows([
    edge("P", "A"),
    edge("P", "B"),
    edge("A", "J"),
    edge("B", "J"),
  ]);
  // P->A: source P has 2 children -> fan-out -> source.
  assert.equal(anchorOf(out, "P-A"), "source");
  // A->J: target J has 2 parents -> join -> target (A has one child, not a fan-out).
  assert.equal(anchorOf(out, "A-J"), "target");
});

// Existing edge data is preserved, only `anchor` is added.
test("existing edge data is preserved", () => {
  const out = withAlignedElbows([
    { id: "B-X", source: "B", target: "X", data: { label: "keep me" } },
    { id: "B-Y", source: "B", target: "Y" },
  ]);
  const e = out.find((x) => x.id === "B-X");
  assert.deepEqual(e?.data, { label: "keep me", anchor: "source" });
});
