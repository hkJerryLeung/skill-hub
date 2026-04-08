import assert from "node:assert/strict";
import { getTopbarRefreshState } from "../src/lib/topbarRefreshState.ts";

assert.deepStrictEqual(
  getTopbarRefreshState({
    loading: false,
    checkingAll: false,
    updatingAll: false,
    updatingSkill: false,
  }),
  {
    disabled: false,
    spinning: false,
    label: "Refresh current page",
  },
);

assert.deepStrictEqual(
  getTopbarRefreshState({
    loading: true,
    checkingAll: false,
    updatingAll: false,
    updatingSkill: false,
  }),
  {
    disabled: true,
    spinning: true,
    label: "Refreshing current page",
  },
);

assert.equal(
  getTopbarRefreshState({
    loading: false,
    checkingAll: true,
    updatingAll: false,
    updatingSkill: false,
  }).disabled,
  true,
);

assert.equal(
  getTopbarRefreshState({
    loading: false,
    checkingAll: false,
    updatingAll: true,
    updatingSkill: false,
  }).disabled,
  true,
);

assert.equal(
  getTopbarRefreshState({
    loading: false,
    checkingAll: false,
    updatingAll: false,
    updatingSkill: true,
  }).disabled,
  true,
);

console.log("topbarRefreshState test passed");
