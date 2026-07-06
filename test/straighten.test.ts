import assert from "node:assert/strict";
import { test } from "node:test";

import { cross, edge, near, node, run } from "./helpers";

// REGRESSION (C1): a node that is both a straight-edge target AND a fan-out parent
// must stay centered on its children's bounding box. The straighten pass must not
// drag it onto its source, which would put it back on the barycenter, the exact
// drift this library fixes. Graph: R -> M -> {X (short), Y (tall)}.
test("straighten does not pull a fan-out parent off its children's bbox", () => {
  const nodes = [
    node("R", 244, 60),
    node("M", 244, 60),
    node("X", 244, 40),
    node("Y", 244, 200),
  ];
  const edges = [edge("R", "M"), edge("M", "X"), edge("M", "Y")];
  const pos = run(nodes, edges); // LR

  const x = pos.get("X")!;
  const y = pos.get("Y")!;
  const m = pos.get("M")!;
  const r = pos.get("R")!;

  const bboxMid =
    (Math.min(cross(x) - x.h / 2, cross(y) - y.h / 2) +
      Math.max(cross(x) + x.h / 2, cross(y) + y.h / 2)) /
    2;

  assert.ok(
    near(cross(m), bboxMid),
    `M center ${cross(m)} should sit on its children's bbox ${bboxMid}`,
  );
  assert.ok(
    !near(cross(m), cross(r), 1),
    `M center ${cross(m)} must NOT be dragged onto R's center ${cross(r)}`,
  );
});

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
