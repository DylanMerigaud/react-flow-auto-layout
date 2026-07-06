import assert from "node:assert/strict";
import { test } from "node:test";

import { cross, edge, node, run } from "./helpers";

// Single-parent fan-out branches keep the DECLARED edge order along the cross axis,
// rather than dagre's crossing-minimisation, which can reshuffle them. Declaring
// P->X, P->Y, P->Z must render X, Y, Z in that cross order.
test("fan-out siblings follow declared edge order", () => {
  const nodes = [
    node("P", 244, 60),
    node("X", 244, 60),
    node("Y", 244, 60),
    node("Z", 244, 60),
  ];
  const edges = [edge("P", "X"), edge("P", "Y"), edge("P", "Z")];
  const pos = run(nodes, edges); // LR, cross axis is Y

  const x = cross(pos.get("X")!);
  const y = cross(pos.get("Y")!);
  const z = cross(pos.get("Z")!);

  assert.ok(x < y, `X (${x}) should come before Y (${y})`);
  assert.ok(y < z, `Y (${y}) should come before Z (${z})`);
});

// A join node with 2+ parents is NOT reordered (it isn't a single-parent branch)
// and is centered on its parents' bounding box.
test("a join node is centered on its parents and not reordered", () => {
  const nodes = [
    node("P", 244, 60),
    node("X", 244, 40),
    node("Y", 244, 40),
    node("Z", 244, 200),
    node("J", 244, 60),
  ];
  const edges = [
    edge("P", "X"),
    edge("P", "Y"),
    edge("P", "Z"),
    edge("X", "J"),
    edge("Y", "J"),
    edge("Z", "J"),
  ];
  const pos = run(nodes, edges);

  const jx = pos.get("X")!;
  const jy = pos.get("Y")!;
  const jz = pos.get("Z")!;
  const j = pos.get("J")!;

  const tops = [jx, jy, jz].map((p) => cross(p) - p.h / 2);
  const bots = [jx, jy, jz].map((p) => cross(p) + p.h / 2);
  const bboxMid = (Math.min(...tops) + Math.max(...bots)) / 2;

  assert.ok(
    Math.abs(cross(j) - bboxMid) <= 0.5,
    `J center ${cross(j)} should equal its parents' bbox mid ${bboxMid}`,
  );
});
