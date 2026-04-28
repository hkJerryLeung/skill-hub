import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const appSource = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");

assert.match(
  appSource,
  /import\s+\{[^}]*confirm\s+as\s+confirmDialog[^}]*\}\s+from\s+"@tauri-apps\/plugin-dialog"/s,
  "App should use the Tauri dialog confirm helper instead of the WebView confirm API",
);
assert.doesNotMatch(
  appSource,
  /window\.confirm/,
  "WebView window.confirm is unreliable in the packaged Tauri app",
);

console.log("tauriDialogConfirmation test passed");
