import assert from "node:assert/strict";
import {
  getAppUpdateActionLabel,
  getAppUpdateStatusText,
  isAppUpdateActionDisabled,
  shouldShowAppUpdateProgress,
} from "../src/lib/appUpdatePresentation.ts";

const idle = { status: "idle", progress: 0, version: null, error: null };
const checking = { status: "checking", progress: 0, version: null, error: null };
const available = {
  status: "available",
  progress: 0,
  version: "0.2.0",
  error: null,
};
const downloading = {
  status: "downloading",
  progress: 48,
  version: "0.2.0",
  error: null,
};
const ready = { status: "ready", progress: 100, version: "0.2.0", error: null };
const installing = {
  status: "installing",
  progress: 100,
  version: "0.2.0",
  error: null,
};
const upToDate = {
  status: "up-to-date",
  progress: 0,
  version: null,
  error: null,
};
const failed = {
  status: "error",
  progress: 0,
  version: null,
  error: "release asset not found",
};

assert.equal(getAppUpdateActionLabel(idle), "Check for Updates");
assert.equal(getAppUpdateActionLabel(checking), "Checking...");
assert.equal(getAppUpdateActionLabel(available), "Downloading v0.2.0...");
assert.equal(getAppUpdateActionLabel(downloading), "Downloading 48%");
assert.equal(getAppUpdateActionLabel(ready), "Install and Relaunch");
assert.equal(getAppUpdateActionLabel(installing), "Installing...");
assert.equal(getAppUpdateActionLabel(upToDate), "Check Again");
assert.equal(getAppUpdateActionLabel(failed), "Retry Check");

assert.equal(getAppUpdateStatusText(idle, "0.1.0"), "Current version: v0.1.0");
assert.equal(getAppUpdateStatusText(checking, "0.1.0"), "Checking for updates...");
assert.equal(getAppUpdateStatusText(available, "0.1.0"), "Downloading v0.2.0...");
assert.equal(getAppUpdateStatusText(downloading, "0.1.0"), "Downloading v0.2.0");
assert.equal(getAppUpdateStatusText(ready, "0.1.0"), "v0.2.0 is ready to install.");
assert.equal(getAppUpdateStatusText(installing, "0.1.0"), "Installing update...");
assert.equal(getAppUpdateStatusText(upToDate, "0.1.0"), "Skill Gate is up to date.");
assert.equal(getAppUpdateStatusText(failed, "0.1.0"), "release asset not found");

assert.equal(isAppUpdateActionDisabled(idle), false);
assert.equal(isAppUpdateActionDisabled(checking), true);
assert.equal(isAppUpdateActionDisabled(available), true);
assert.equal(isAppUpdateActionDisabled(downloading), true);
assert.equal(isAppUpdateActionDisabled(ready), false);
assert.equal(isAppUpdateActionDisabled(installing), true);
assert.equal(isAppUpdateActionDisabled(upToDate), false);
assert.equal(isAppUpdateActionDisabled(failed), false);

assert.equal(shouldShowAppUpdateProgress(idle), false);
assert.equal(shouldShowAppUpdateProgress(downloading), true);
assert.equal(shouldShowAppUpdateProgress(ready), false);

console.log("appUpdatePresentation test passed");
