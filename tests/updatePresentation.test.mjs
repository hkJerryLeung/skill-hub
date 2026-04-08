import assert from "node:assert/strict";
import {
  canTriggerInlineUpdate,
  getCardStatusLabel,
  getInlineUpdateLabel,
} from "../src/lib/updatePresentation.ts";

const githubUpdate = {
  update_status: "update_available",
  update_capability: "github",
  upstream_version: "1.4.2",
};

assert.equal(canTriggerInlineUpdate(githubUpdate), true);
assert.equal(getInlineUpdateLabel(githubUpdate), "Update to v1.4.2");
assert.equal(
  getCardStatusLabel({
    update_status: "update_available",
    update_capability: "github",
  }),
  "Update Available",
);

assert.equal(
  getInlineUpdateLabel({
    update_status: "update_available",
    update_capability: "github",
    upstream_version: null,
  }),
  "Update Available",
);

assert.equal(
  canTriggerInlineUpdate({
    update_status: "update_available",
    update_capability: "external",
    upstream_version: "2.0.0",
  }),
  false,
);

assert.equal(
  getInlineUpdateLabel({
    update_status: "manual_only",
    update_capability: "manual",
    upstream_version: "9.9.9",
  }),
  null,
);
assert.equal(
  getCardStatusLabel({
    update_status: "unversioned",
    update_capability: "manual",
  }),
  null,
);
assert.equal(
  getCardStatusLabel({
    update_status: "up_to_date",
    update_capability: "github",
  }),
  null,
);
assert.equal(
  getCardStatusLabel({
    update_status: "update_available",
    update_capability: "external",
  }),
  "Manual Update",
);

console.log("updatePresentation test passed");
