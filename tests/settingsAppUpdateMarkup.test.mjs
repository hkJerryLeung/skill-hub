import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const settingsSource = readFileSync(
  new URL("../src/components/SettingsView/SettingsView.tsx", import.meta.url),
  "utf8",
);
const appSource = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");

assert.match(settingsSource, /appUpdateState/, "SettingsView should receive app update state");
assert.match(settingsSource, /App Update/, "Settings should render an app update section");
assert.match(
  settingsSource,
  /settings-update-progress/,
  "Settings should render update download progress",
);
assert.match(appSource, /@tauri-apps\/plugin-updater/, "App should use Tauri updater");
assert.match(appSource, /@tauri-apps\/plugin-process/, "App should relaunch after install");
assert.match(appSource, /handleCheckForAppUpdate/, "App should expose a manual update check");

console.log("settingsAppUpdateMarkup test passed");
