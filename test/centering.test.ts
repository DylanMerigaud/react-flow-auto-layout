import assert from "node:assert/strict";
import { test } from "node:test";

import { cross, edge, near, node, run } from "./helpers";

// A parent of two children with very different heights must sit on the true middle
// of their bounding box (top of the topmost to bottom of the bottommost), NOT on
// dagre's barycenter (the average of the two centers), which drifts when siblings
// differ in size. This is the headline behavior dagre alone gets wrong.
test("parent centers on the children's bounding box, not the barycenter", () => {
  const nodes = [node("P", 244, 80), node("A", 244, 40), node("B", 244, 200)];
  const edges = [edge("P", "A"), edge("P", "B")];
  const pos = run(nodes, edges); // LR

  const a = pos.get("A")!;
  const b = pos.get("B")!;
  const p = pos.get("P")!;

  const topA = cross(a) - a.h / 2;
  const botA = cross(a) + a.h / 2;
  const topB = cross(b) - b.h / 2;
  const botB = cross(b) + b.h / 2;
  const bboxMid = (Math.min(topA, topB) + Math.max(botA, botB)) / 2;
  const barycenter = (cross(a) + cross(b)) / 2;

  assert.ok(
    near(cross(p), bboxMid),
    `P center ${cross(p)} should equal bbox mid ${bboxMid}`,
  );
  // The two must differ here (unequal heights), so this proves the bbox pass ran
  // instead of leaving dagre's barycenter.
  assert.ok(
    !near(bboxMid, barycenter, 1),
    `test is only meaningful when bbox mid ${bboxMid} != barycenter ${barycenter}`,
  );
  assert.ok(
    !near(cross(p), barycenter, 1),
    `P center ${cross(p)} must NOT be the barycenter ${barycenter}`,
  );
});
