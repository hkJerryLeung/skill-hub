import assert from "node:assert/strict";
import { shouldStartPointerDrag } from "../src/lib/dragDropState.ts";

assert.equal(
  shouldStartPointerDrag({
    startX: 100,
    startY: 100,
    currentX: 102,
    currentY: 103,
  }),
  false,
);

assert.equal(
  shouldStartPointerDrag({
    startX: 100,
    startY: 100,
    currentX: 108,
    currentY: 100,
  }),
  true,
);

assert.equal(
  shouldStartPointerDrag({
    startX: 100,
    startY: 100,
    currentX: 104,
    currentY: 104,
  }),
  false,
);

assert.equal(
  shouldStartPointerDrag({
    startX: 100,
    startY: 100,
    currentX: 104,
    currentY: 104,
    threshold: 5,
  }),
  true,
);

console.log("pointerDragThreshold test passed");
