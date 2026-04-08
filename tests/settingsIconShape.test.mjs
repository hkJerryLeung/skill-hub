import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const iconsSource = readFileSync(
  new URL("../src/components/Icons/Icons.tsx", import.meta.url),
  "utf8",
);

assert.match(
  iconsSource,
  /export const SettingsIcon[\s\S]*viewBox="0 0 24 24"/,
  "Settings icon should use the 24x24 gear glyph",
);

assert.match(
  iconsSource,
  /M10\.325 4\.317c\.426-1\.756 2\.924-1\.756 3\.35 0/,
  "Settings icon should use the gear outline path",
);

assert.doesNotMatch(
  iconsSource,
  /M8 1\.5v1\.5M8 13v1\.5M1\.5 8H3M13 8h1\.5/,
  "Settings icon should no longer use the sun-ray path",
);

console.log("settingsIconShape test passed");
