import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const appSource = readFileSync(
  new URL("../src/App.tsx", import.meta.url),
  "utf8",
);

assert.match(
  appSource,
  /resolveCurrentDropTargetAtPoint/,
  "App should centralize drop target hit-testing for pointer drag",
);
assert.match(
  appSource,
  /const handlePointerUp = \(event: MouseEvent\)/,
  "Pointer drag release should inspect the mouseup event",
);
assert.match(
  appSource,
  /resolveCurrentDropTargetAtPoint\(\s*event\.clientX,\s*event\.clientY,\s*\)/,
  "Pointer drag release should resolve the final target from release coordinates",
);

console.log("pointerDropReleaseTargetMarkup test passed");
