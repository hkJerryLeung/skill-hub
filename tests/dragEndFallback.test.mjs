import assert from "node:assert/strict";
import { resolveDragEndFallbackTarget } from "../src/lib/dragDropState.ts";

assert.equal(
  resolveDragEndFallbackTarget({
    currentDropTarget: "Codex",
    dropHandled: false,
    migrationInFlight: false,
  }),
  "Codex",
);

assert.equal(
  resolveDragEndFallbackTarget({
    currentDropTarget: "Codex",
    dropHandled: true,
    migrationInFlight: false,
  }),
  null,
);

assert.equal(
  resolveDragEndFallbackTarget({
    currentDropTarget: null,
    dropHandled: false,
    migrationInFlight: false,
  }),
  null,
);

assert.equal(
  resolveDragEndFallbackTarget({
    currentDropTarget: "Shared Library",
    dropHandled: false,
    migrationInFlight: true,
  }),
  null,
);

console.log("dragEndFallback test passed");
