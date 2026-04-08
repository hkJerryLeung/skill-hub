import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const sidebarSource = readFileSync(
  new URL("../src/components/Sidebar/Sidebar.tsx", import.meta.url),
  "utf8",
);

assert.doesNotMatch(
  sidebarSource,
  /interface SharedLibraryCategoryItem/,
  "Sidebar should not define a shared-library category row model",
);
assert.doesNotMatch(
  sidebarSource,
  /sharedCategories: SharedLibraryCategoryItem\[]/,
  "Sidebar props should not accept shared category children",
);
assert.doesNotMatch(
  sidebarSource,
  /sidebar-subtree/,
  "Sidebar should not render a Shared Library category subtree",
);

console.log("sidebarStructure test passed");
