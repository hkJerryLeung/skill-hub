import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const appSource = readFileSync(
  new URL("../src/App.tsx", import.meta.url),
  "utf8",
);

assert.match(
  appSource,
  /targetKey === "Bin"/,
  "Dragging onto Bin should use a dedicated move-to-bin branch",
);
assert.match(
  appSource,
  /executeMoveToBinBatch/,
  "App should batch move dropped skills into Bin instead of migrating them as agent installs",
);
assert.match(
  appSource,
  /invoke<string>\("move_skill_to_bin"/,
  "Move-to-bin flow should call the Tauri move_skill_to_bin command",
);
assert.doesNotMatch(
  appSource,
  /Restore from Bin is not available yet/,
  "Dragging Bin skills back to agents or shared categories should be allowed",
);

console.log("binDropFlowMarkup test passed");
