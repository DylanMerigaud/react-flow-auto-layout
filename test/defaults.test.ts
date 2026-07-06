import assert from "node:assert/strict";
import { test } from "node:test";

import { layout, DEFAULT_NODE_WIDTH } from "../src/index";
import { cross, edge, near, node, run } from "./helpers";

// With no options and no sizeOf, every node falls back to the default size and the
// call still works: layout(nodes, edges) is a valid zero-config call.
test("layout(nodes, edges) works with no options", () => {
  const nodes = [
    { id: "A", position: { x: 0, y: 0 }, data: {} },
    { id: "B", position: { x: 0, y: 0 }, data: {} },
  ];
  const laid = layout(nodes, [edge("A", "B")]);
  assert.equal(laid.length, 2);
  // Two nodes in a chain lay out on different ranks (columns), so their x differs by
  // roughly a node width plus the rank gap.
  const [a, b] = laid;
  assert.notEqual(a!.position.x, b!.position.x);
  assert.ok(
    b!.position.x - a!.position.x >= DEFAULT_NODE_WIDTH,
    "the second node should be at least a node-width to the right",
  );
});

// rankSep / nodeSep overrides change the gaps.
test("rankSep widens the gap between ranks", () => {
  const nodes = [node("A", 100, 60), node("B", 100, 60)];
  const edges = [edge("A", "B")];
  const tight = run(nodes, edges, { rankSep: 40 });
  const wide = run(nodes, edges, { rankSep: 400 });
  const tightGap = tight.get("B")!.x - tight.get("A")!.x;
  const wideGap = wide.get("B")!.x - wide.get("A")!.x;
  assert.ok(
    wideGap > tightGap + 300,
    `wide gap ${wideGap} should exceed tight gap ${tightGap} by ~rankSep delta`,
  );
});

// REGRESSION GUARD for the width generalization. In TB layout the cross axis is X,
// so a parent must center on its children's WIDTH bounding box. The original
// fixed-244 code could not do this: with widths 100 vs 300 it would mis-center.
test("TB layout centers a parent on its children's WIDTH bounding box", () => {
  const nodes = [node("P", 200, 60), node("A", 100, 60), node("B", 300, 60)];
  const edges = [edge("P", "A"), edge("P", "B")];
  const pos = run(nodes, edges, { vertical: true });

  const a = pos.get("A")!;
  const b = pos.get("B")!;
  const p = pos.get("P")!;

  const leftA = cross(a, true) - a.w / 2;
  const rightA = cross(a, true) + a.w / 2;
  const leftB = cross(b, true) - b.w / 2;
  const rightB = cross(b, true) + b.w / 2;
  const bboxMid = (Math.min(leftA, leftB) + Math.max(rightA, rightB)) / 2;

  assert.ok(
    near(cross(p, true), bboxMid),
    `P x-center ${cross(p, true)} should equal children's width bbox mid ${bboxMid}`,
  );
});

// Shape guards: pathological small inputs must not throw and must return a position
// for every node.
test("empty, single-node, and disconnected graphs do not throw", () => {
  assert.deepEqual(layout([], []), []);

  const one = layout([node("A", 244, 80)], []);
  assert.equal(one.length, 1);
  assert.ok(Number.isFinite(one[0]!.position.x));
  assert.ok(Number.isFinite(one[0]!.position.y));

  // Two roots, no edges between them: both get finite positions.
  const two = run([node("A", 244, 80), node("B", 244, 80)], []);
  assert.ok(Number.isFinite(two.get("A")!.x));
  assert.ok(Number.isFinite(two.get("B")!.y));
});
