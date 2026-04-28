import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const cargoManifest = readFileSync(
  new URL("../src-tauri/Cargo.toml", import.meta.url),
  "utf8",
);
const tauriSource = readFileSync(
  new URL("../src-tauri/src/lib.rs", import.meta.url),
  "utf8",
);

assert.match(
  cargoManifest,
  /tauri-plugin-single-instance\s*=/,
  "Tauri should depend on the single-instance plugin",
);
assert.match(
  tauriSource,
  /tauri_plugin_single_instance::init/,
  "Tauri should register the single-instance plugin",
);
assert.match(
  tauriSource,
  /get_webview_window\("main"\)/,
  "Second launches should target the existing main window",
);
assert.match(
  tauriSource,
  /set_focus\(\)/,
  "Second launches should bring the existing main window forward",
);

console.log("tauriSingleInstance test passed");
