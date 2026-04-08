import assert from "node:assert/strict";
import { resolveSidebarDropTargetKey } from "../src/lib/dragDropState.ts";

assert.equal(resolveSidebarDropTargetKey("Shared Library"), "Shared Library");
assert.equal(resolveSidebarDropTargetKey("Claude Code"), "Claude Code");
assert.equal(resolveSidebarDropTargetKey("Antigravity"), "Antigravity");
assert.equal(resolveSidebarDropTargetKey("Codex"), "Codex");
assert.equal(resolveSidebarDropTargetKey("shared-category:data-analysis"), null);
assert.equal(resolveSidebarDropTargetKey("all"), null);
assert.equal(resolveSidebarDropTargetKey("unknown"), null);
assert.equal(resolveSidebarDropTargetKey(null), null);

console.log("sidebarDropTarget test passed");
