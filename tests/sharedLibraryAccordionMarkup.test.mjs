import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const appSource = readFileSync(
  new URL("../src/App.tsx", import.meta.url),
  "utf8",
);
const skillGridSource = readFileSync(
  new URL("../src/components/SkillGrid/SkillGrid.tsx", import.meta.url),
  "utf8",
);

assert.match(
  appSource,
  /collapsedSharedCategories/,
  "App should track collapsed Shared Library category sections",
);
assert.match(
  appSource,
  /sharedCategoryGroups/,
  "App should pass grouped Shared Library data into the skill list",
);
assert.match(
  skillGridSource,
  /shared-category-section/,
  "SkillGrid should render Shared Library category sections",
);
assert.match(
  skillGridSource,
  /shared-category-header/,
  "SkillGrid should render category accordion headers",
);
assert.match(
  skillGridSource,
  /data-drop-target=\{`shared-category:\$\{group\.slug\}`\}/,
  "SkillGrid category headers should expose content-area drop targets",
);
assert.match(
  skillGridSource,
  /onSharedCategoryDrop/,
  "SkillGrid should support dropping skills onto category headers",
);

console.log("sharedLibraryAccordionMarkup test passed");
