import assert from "node:assert/strict";
import {
  resolveDropTargetFromPoint,
  resolveDropTargetKey,
} from "../src/lib/dragDropState.ts";

const rects = [
  { targetKey: "Shared Library", left: 0, right: 220, top: 0, bottom: 40 },
  { targetKey: "shared-category:data-analysis", left: 260, right: 760, top: 120, bottom: 164 },
  { targetKey: "Codex", left: 0, right: 220, top: 41, bottom: 80 },
];

assert.equal(resolveDropTargetKey("Shared Library"), "Shared Library");
assert.equal(
  resolveDropTargetKey("shared-category:data-analysis"),
  "shared-category:data-analysis",
);
assert.equal(
  resolveDropTargetFromPoint(rects, { clientX: 420, clientY: 140 }),
  "shared-category:data-analysis",
);
assert.equal(
  resolveDropTargetFromPoint(rects, { clientX: 100, clientY: 20 }),
  "Shared Library",
);
assert.equal(
  resolveDropTargetFromPoint(rects, { clientX: 900, clientY: 500 }),
  null,
);

console.log("dropTargetPoint test passed");
