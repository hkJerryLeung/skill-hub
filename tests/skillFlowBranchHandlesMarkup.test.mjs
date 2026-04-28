import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const skillFlowSource = readFileSync(
  new URL("../src/components/SkillFlow/SkillFlowView.tsx", import.meta.url),
  "utf8",
);

assert.match(
  skillFlowSource,
  /sourceHandle: edge\.sourceHandle/,
  "Expected React Flow edges to use explicit source handles",
);
assert.match(
  skillFlowSource,
  /targetHandle: edge\.targetHandle/,
  "Expected React Flow edges to use explicit target handles",
);
assert.match(
  skillFlowSource,
  /id=\{SKILL_FLOW_MAIN_SOURCE_HANDLE\}[\s\S]*?position=\{Position\.Right\}/,
  "Expected main flow to leave each node from the right handle",
);
assert.match(
  skillFlowSource,
  /id=\{SKILL_FLOW_MAIN_TARGET_HANDLE\}[\s\S]*?position=\{Position\.Left\}/,
  "Expected main flow to enter each node from the left handle",
);
assert.match(
  skillFlowSource,
  /id=\{SKILL_FLOW_BRANCH_SOURCE_HANDLE\}[\s\S]*?position=\{Position\.Bottom\}/,
  "Expected branch flow to leave parent nodes from the bottom handle",
);
assert.match(
  skillFlowSource,
  /id=\{SKILL_FLOW_BRANCH_TARGET_HANDLE\}[\s\S]*?position=\{Position\.Top\}/,
  "Expected branch flow to enter branch nodes from the top handle",
);

console.log("skillFlowBranchHandlesMarkup test passed");
