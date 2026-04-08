import assert from "node:assert/strict";
import { resolveSidebarTargetFromPoint } from "../src/lib/dragDropState.ts";

const rects = [
  { agentKey: "all", left: 0, right: 220, top: 0, bottom: 40 },
  { agentKey: "Shared Library", left: 0, right: 220, top: 41, bottom: 80 },
  { agentKey: "shared-category:data-analysis", left: 12, right: 220, top: 81, bottom: 120 },
  { agentKey: "Codex", left: 0, right: 220, top: 121, bottom: 160 },
];

assert.equal(
  resolveSidebarTargetFromPoint(rects, { clientX: 100, clientY: 60 }),
  "Shared Library",
);

assert.equal(
  resolveSidebarTargetFromPoint(rects, { clientX: 120, clientY: 100 }),
  "shared-category:data-analysis",
);

assert.equal(
  resolveSidebarTargetFromPoint(rects, { clientX: 120, clientY: 140 }),
  "Codex",
);

assert.equal(
  resolveSidebarTargetFromPoint(rects, { clientX: 120, clientY: 20 }),
  null,
);

assert.equal(
  resolveSidebarTargetFromPoint(rects, { clientX: 400, clientY: 400 }),
  null,
);

console.log("sidebarPointTarget test passed");
