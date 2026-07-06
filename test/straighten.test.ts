import assert from "node:assert/strict";
import { test } from "node:test";

import { cross, edge, near, node, run } from "./helpers";

// A single in / single out chain A to B to C, with different heights, must render
// perfectly colinear: every node shares one cross-axis center. Without the
// straighten pass their centers differ (each sits at its own dagre center) and the
// connector kinks. This is the fix for the "kinked linear edges" pain.
test("a linear chain is colinear despite unequal heights", () => {
  const nodes = [node("A", 244, 40), node("B", 244, 120), node("C", 244, 40)];
  const edges = [edge("A", "B"), edge("B", "C")];
  const pos = run(nodes, edges); // LR

  const ca = cross(pos.get("A")!);
  const cb = cross(pos.get("B")!);
  const cc = cross(pos.get("C")!);

  assert.ok(near(ca, cb), `A center ${ca} should equal B center ${cb}`);
  assert.ok(near(cb, cc), `B center ${cb} should equal C center ${cc}`);
});

// The same must hold vertically (TB), where the cross axis is X and widths vary.
test("a linear chain is colinear in TB layout with unequal widths", () => {
  const nodes = [node("A", 100, 60), node("B", 300, 60), node("C", 120, 60)];
  const edges = [edge("A", "B"), edge("B", "C")];
  const pos = run(nodes, edges, { vertical: true });

  const ca = cross(pos.get("A")!, true);
  const cb = cross(pos.get("B")!, true);
  const cc = cross(pos.get("C")!, true);

  assert.ok(near(ca, cb), `A x-center ${ca} should equal B x-center ${cb}`);
  assert.ok(near(cb, cc), `B x-center ${cb} should equal C x-center ${cc}`);
});
