import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const skillGridSource = readFileSync(
  new URL("../src/components/SkillGrid/SkillGrid.tsx", import.meta.url),
  "utf8",
);
const skillGridStyles = readFileSync(
  new URL("../src/components/SkillGrid/SkillGrid.css", import.meta.url),
  "utf8",
);
const symlinkRowStyles =
  skillGridStyles.match(/\.skill-card\.skill-list-row\.symlink-skill \{[\s\S]*?\n\}/)?.[0] ??
  "";

assert.match(
  skillGridSource,
  /buildSkillPurposeComparison/,
  "SkillGrid should render a presentation-built purpose comparison",
);
assert.match(
  skillGridSource,
  /Before/,
  "SkillGrid should label the original description column as Before",
);
assert.match(
  skillGridSource,
  />After</,
  "SkillGrid should label the result column as After",
);
assert.doesNotMatch(
  skillGridSource,
  /After（中文用途）/,
  "SkillGrid should not include the parenthetical Chinese purpose suffix",
);
assert.doesNotMatch(
  skillGridSource,
  /Meta/,
  "SkillGrid should not render a Meta column",
);
assert.doesNotMatch(
  skillGridSource,
  /getVersionLabel/,
  "SkillGrid should not render version labels or Unversioned tags",
);
assert.doesNotMatch(
  skillGridSource,
  /skill-card-version/,
  "SkillGrid should not render version tag markup",
);
assert.doesNotMatch(
  skillGridSource,
  /skill-list-meta/,
  "SkillGrid should not render the meta cell",
);
assert.doesNotMatch(
  skillGridStyles,
  /skill-card-version/,
  "SkillGrid styles should not keep version tag styling",
);
assert.doesNotMatch(
  skillGridStyles,
  /skill-list-meta/,
  "SkillGrid styles should not keep meta cell styling",
);
assert.doesNotMatch(
  skillGridSource,
  /skill-card-badge/,
  "SkillGrid should not render SYMLINK or LOCAL tag markup",
);
assert.doesNotMatch(
  skillGridSource,
  /SYMLINK|LOCAL/,
  "SkillGrid should not display SYMLINK or LOCAL text in list rows",
);
assert.doesNotMatch(
  skillGridStyles,
  /skill-card-badge/,
  "SkillGrid styles should not keep SYMLINK or LOCAL tag styling",
);
assert.match(
  skillGridSource,
  /symlink-skill/,
  "SkillGrid should mark symlink rows with a dedicated class",
);
assert.match(
  skillGridSource,
  /non-shared-skill/,
  "SkillGrid should mark non-shared rows with a dedicated class",
);
assert.match(
  skillGridStyles,
  /\.skill-card\.skill-list-row\.symlink-skill/,
  "SkillGrid styles should target symlink skill rows",
);
assert.match(
  skillGridStyles,
  /\.skill-card\.skill-list-row\.symlink-skill::before/,
  "Symlink skill rows should use a thin board-style overlay",
);
assert.match(
  skillGridStyles,
  /border:\s*0\.5px solid color-mix\(in srgb, var\(--accent-secondary\) 14%, transparent\)/,
  "Symlink skill rows should use a very fine, faint board-style border",
);
assert.match(
  skillGridStyles,
  /animation:\s*symlinkBoardBreath\s+10s/,
  "Symlink skill rows should use a very slow, subtle glow loop",
);
assert.match(
  skillGridStyles,
  /opacity:\s*0\.22/,
  "Symlink skill rows should keep the board overlay faint",
);
assert.match(
  skillGridStyles,
  /\.skill-card\.skill-list-row\.symlink-skill :is\(\.skill-card-name, \.skill-card-summary, \.skill-list-text, \.skill-list-cell-label\)\s*\{\s*color: var\(--text-primary\);/,
  "Symlink skill rows should render all row text as primary white",
);
assert.match(
  skillGridStyles,
  /\.skill-card\.skill-list-row\.non-shared-skill :is\(\.skill-card-name, \.skill-card-summary, \.skill-list-text, \.skill-list-cell-label\)\s*\{\s*color: var\(--text-primary\);/,
  "Non-shared skill rows should render all row text as primary white",
);
assert.doesNotMatch(
  symlinkRowStyles,
  /0 0 0 1px var\(--accent-primary\)/,
  "Symlink skill rows should avoid a thick solid red outline",
);
assert.match(
  skillGridSource,
  /skill-list-row/,
  "SkillGrid should render skills as list rows",
);
assert.match(
  skillGridSource,
  /skill-card-summary/,
  "SkillGrid should render a short Chinese summary under the skill name",
);
assert.doesNotMatch(
  skillGridSource,
  /skill-card-agent/,
  "SkillGrid should not render the agent name under the skill name",
);
assert.doesNotMatch(
  skillGridSource,
  /\{skill\.agent\}<\/span>/,
  "SkillGrid should not display Shared Library, Codex, Claude Code, or other agent text under the name",
);
assert.match(
  skillGridStyles,
  /\.skill-list/,
  "SkillGrid styles should include the list layout",
);
assert.doesNotMatch(
  skillGridStyles,
  /repeat\(auto-fill/,
  "SkillGrid should no longer use the card auto-fill grid layout",
);

console.log("skillGridListMarkup test passed");
