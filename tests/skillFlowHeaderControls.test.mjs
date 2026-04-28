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
  /event\.key !== "Escape"/,
  "Expected Skill Flow to listen for Escape key presses",
);
assert.match(
  skillFlowSource,
  /onClose\(\)/,
  "Expected Escape handling to close the Skill Flow overlay",
);
assert.match(
  skillFlowSource,
  /document\.addEventListener\("keydown", handleEscapeKeyDown\)/,
  "Expected Skill Flow to register a keydown listener",
);
assert.match(
  skillFlowSource,
  /document\.removeEventListener\("keydown", handleEscapeKeyDown\)/,
  "Expected Skill Flow to clean up its keydown listener",
);
assert.match(
  skillFlowSource,
  /skill-flow-action-button-danger/,
  "Skill Flow header should render a danger action for Bin removal",
);
assert.match(
  skillFlowSource,
  /TrashIcon/,
  "Skill Flow header should render the local trash icon for Move to Bin",
);
assert.match(
  skillFlowSource,
  /Move to Bin/,
  "Skill Flow header should expose Move to Bin for non-Bin skills",
);
assert.doesNotMatch(
  skillFlowSource,
  /onUninstall/,
  "Skill Flow should not accept uninstall behavior in node mode",
);
assert.doesNotMatch(
  appSource,
  /<SkillFlowView[\s\S]*?onUninstall=/,
  "App should not pass uninstall behavior into Skill Flow node mode",
);
assert.doesNotMatch(
  skillFlowSource,
  /getVersionLabel/,
  "Skill Flow header should not render version labels or Unversioned tags",
);
assert.doesNotMatch(
  skillFlowSource,
  /Unversioned/,
  "Skill Flow source should not contain the Unversioned tag",
);

console.log("skillFlowHeaderControls test passed");
