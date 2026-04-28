import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const skillFlowSource = readFileSync(
  new URL("../src/components/SkillFlow/SkillFlowView.tsx", import.meta.url),
  "utf8",
);
const skillFlowStyles = readFileSync(
  new URL("../src/components/SkillFlow/SkillFlowView.css", import.meta.url),
  "utf8",
);

assert.doesNotMatch(
  skillFlowSource,
  /InstallTargetList/,
  "Skill Flow should not render Install Targets as a node",
);
assert.match(
  skillFlowSource,
  /convertFileSrc/,
  "Expected file branch nodes to create Tauri asset URLs for previews",
);
assert.match(
  skillFlowSource,
  /skill-flow-file-preview-image/,
  "Expected image files to render as image previews",
);
assert.match(
  skillFlowSource,
  /skill-flow-file-preview-frame/,
  "Expected embeddable document files to render inside a preview frame",
);
assert.match(
  skillFlowSource,
  /noWheelClassName="nowheel"/,
  "Expected node scroll areas to be exempt from board wheel panning",
);
assert.match(
  skillFlowSource,
  /className="skill-flow-node-body nowheel nodrag nopan"/,
  "Expected SKILL.md section text to scroll inside the node",
);
assert.match(
  skillFlowStyles,
  /\.skill-flow-node\s*\{[\s\S]*?max-height: min\(760px, calc\(100vh - 140px\)\);/,
  "Expected longer nodes so more section text is visible",
);

console.log("skillFlowAssetMarkup test passed");
