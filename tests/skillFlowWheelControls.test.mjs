import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const skillFlowSource = readFileSync(
  new URL("../src/components/SkillFlow/SkillFlowView.tsx", import.meta.url),
  "utf8",
);

assert.match(
  skillFlowSource,
  /PanOnScrollMode/,
  "Expected SkillFlowView to import React Flow pan-on-scroll mode support",
);
assert.match(
  skillFlowSource,
  /panOnScroll=\{true\}/,
  "Expected plain wheel or trackpad scroll to pan the board",
);
assert.match(
  skillFlowSource,
  /panOnScrollMode=\{PanOnScrollMode\.Free\}/,
  "Expected wheel panning to support both vertical and horizontal movement",
);
assert.match(
  skillFlowSource,
  /zoomOnScroll=\{false\}/,
  "Expected plain wheel or trackpad scroll not to zoom the board",
);
assert.match(
  skillFlowSource,
  /zoomActivationKeyCode="Alt"/,
  "Expected Option/Alt + scroll to activate zoom",
);

console.log("skillFlowWheelControls test passed");
