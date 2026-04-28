import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const skillFlowStyles = readFileSync(
  new URL("../src/components/SkillFlow/SkillFlowView.css", import.meta.url),
  "utf8",
);

assert.match(
  skillFlowStyles,
  /\.skill-flow-canvas \.react-flow__background\s*\{[\s\S]*?opacity: 0\.[0-4]/,
  "Expected the skill flow grid background to be more transparent than the default",
);

console.log("skillFlowGridMarkup test passed");
