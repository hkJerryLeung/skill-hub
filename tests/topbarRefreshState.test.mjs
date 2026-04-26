import assert from "node:assert/strict";
import { getTopbarRefreshState } from "../src/lib/topbarRefreshState.ts";

assert.deepStrictEqual(
  getTopbarRefreshState({ loading: false }),
  {
    disabled: false,
    spinning: false,
    label: "Refresh current page",
  },
);

assert.deepStrictEqual(
  getTopbarRefreshState({ loading: true }),
  {
    disabled: true,
    spinning: true,
    label: "Refreshing current page",
  },
);

console.log("topbarRefreshState test passed");
