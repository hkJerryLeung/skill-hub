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
assert.match(
  sidebarSource,
  /TrashIcon/,
  "Sidebar should import the bin icon from the local icon catalogue",
);
assert.match(
  sidebarSource,
  /\{ key: "Bin", label: "Bin", Icon: TrashIcon \}/,
  "Agents section should include Bin as the last agent row",
);
assert.match(
  sidebarSource,
  /"Cursor"[\s\S]*"Bin"[\s\S]*\]/,
  "Bin should be listed after Cursor in the Agents section",
);

console.log("sidebarStructure test passed");
