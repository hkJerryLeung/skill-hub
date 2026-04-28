import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const skillFlowStyles = readFileSync(
  new URL("../src/components/SkillFlow/SkillFlowView.css", import.meta.url),
  "utf8",
);

assert.match(
  skillFlowStyles,
  /\.skill-flow-canvas \.react-flow__pane\s*\{[\s\S]*?cursor: default;/,
  "Expected the skill flow pane to use the normal cursor when idle",
);
assert.doesNotMatch(
  skillFlowStyles,
  /\.skill-flow-canvas \.react-flow__pane\s*\{[\s\S]*?cursor: grab;/,
  "Idle skill flow pane should not use the grab cursor",
);
assert.match(
  skillFlowStyles,
  /\.skill-flow-canvas \.react-flow__pane:active\s*\{[\s\S]*?cursor: grabbing;/,
  "Expected the skill flow pane to show grabbing only while active",
);

console.log("skillFlowCursorMarkup test passed");
