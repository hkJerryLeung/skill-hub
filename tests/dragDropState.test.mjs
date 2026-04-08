import assert from "node:assert/strict";
import { resolveDragLeaveSnapshot } from "../src/lib/dragDropState.ts";

const activeTargetLeave = resolveDragLeaveSnapshot(
  {
    currentDropTarget: "Codex",
    dragOverTarget: "Codex",
  },
  false,
);

assert.deepStrictEqual(activeTargetLeave, {
  currentDropTarget: "Codex",
  dragOverTarget: "Codex",
});

const staleDragLeave = resolveDragLeaveSnapshot(
  {
    currentDropTarget: "Shared Library",
    dragOverTarget: "Codex",
  },
  false,
);

assert.deepStrictEqual(staleDragLeave, {
  currentDropTarget: "Shared Library",
  dragOverTarget: "Shared Library",
});

const internalMove = resolveDragLeaveSnapshot(
  {
    currentDropTarget: "Claude Code",
    dragOverTarget: "Claude Code",
  },
  true,
);

assert.deepStrictEqual(internalMove, {
  currentDropTarget: "Claude Code",
  dragOverTarget: "Claude Code",
});

const noActiveTarget = resolveDragLeaveSnapshot(
  {
    currentDropTarget: null,
    dragOverTarget: null,
  },
  false,
);

assert.deepStrictEqual(noActiveTarget, {
  currentDropTarget: null,
  dragOverTarget: null,
});

console.log("dragDropState test passed");
