import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const settingsSource = readFileSync(
  new URL("../src/components/SettingsView/SettingsView.tsx", import.meta.url),
  "utf8",
);

const appSource = readFileSync(
  new URL("../src/App.tsx", import.meta.url),
  "utf8",
);

assert.match(
  settingsSource,
  /Bin Folder/,
  "Settings should expose a Bin Folder path field",
);
assert.match(
  settingsSource,
  /draftSettings\.bin_path/,
  "Settings Bin Folder input should read from draftSettings.bin_path",
);
assert.match(
  settingsSource,
  /onSettingsChange\("bin_path"/,
  "Settings Bin Folder input should write to bin_path",
);
assert.match(
  settingsSource,
  /onBrowseBin/,
  "Settings should expose a Browse action for the Bin Folder",
);
assert.match(
  appSource,
  /handleBrowseBin/,
  "App should wire Settings Bin Folder browsing",
);

console.log("binSettingsMarkup test passed");
