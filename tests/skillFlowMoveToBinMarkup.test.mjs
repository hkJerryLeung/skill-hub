import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const skillFlowSource = readFileSync(
  new URL("../src/components/SkillFlow/SkillFlowView.tsx", import.meta.url),
  "utf8",
);
const appSource = readFileSync(
  new URL("../src/App.tsx", import.meta.url),
  "utf8",
);

assert.match(
  skillFlowSource,
  /onRemove/,
  "SkillFlowView should expose a remove action callback",
);
assert.match(
  skillFlowSource,
  /Move to Bin/,
  "SkillFlowView should show Move to Bin outside the Bin view",
);
assert.match(
  skillFlowSource,
  /Delete Permanently/,
  "SkillFlowView should show Delete Permanently for Bin skills",
);
assert.match(
  skillFlowSource,
  /TrashIcon/,
  "SkillFlowView should use the local trash icon for the danger action",
);
assert.match(
  appSource,
  /onRemove=\{handleRemoveSkill\}/,
  "App should wire SkillFlowView removal to handleRemoveSkill",
);

console.log("skillFlowMoveToBinMarkup test passed");
