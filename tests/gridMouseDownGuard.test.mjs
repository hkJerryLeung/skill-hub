import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const appSource = readFileSync(
  new URL("../src/App.tsx", import.meta.url),
  "utf8",
);

assert.match(
  appSource,
  /closest\("\.skill-card, \.shared-category-header"\)/,
  "Grid mouse-down guard should ignore Shared Library category headers",
);

console.log("gridMouseDownGuard test passed");
