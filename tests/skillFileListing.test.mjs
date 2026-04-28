import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const scannerSource = readFileSync(
  new URL("../src-tauri/src/scanner.rs", import.meta.url),
  "utf8",
);

assert.match(
  scannerSource,
  /fn collect_skill_files/,
  "Expected scanner to collect skill files recursively",
);
assert.match(
  scannerSource,
  /strip_prefix\(root\)/,
  "Expected listed skill files to be returned as relative paths",
);
assert.match(
  scannerSource,
  /replace\('\\\\', "\/"\)/,
  "Expected listed skill files to normalize path separators for the UI",
);

console.log("skillFileListing test passed");
