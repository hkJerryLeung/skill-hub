import assert from "node:assert/strict";
import {
  applyStatusFilter,
  getStatusCounts,
  toggleStatusFilter,
} from "../src/lib/skillFilters.ts";

const skills = [
  {
    name: "Symlinked updatable",
    description: "demo",
    path: "/tmp/a",
    canonical_path: "/tmp/a",
    agent: "Codex",
    is_symlink: true,
    category: null,
    version: null,
    source: null,
    update_capability: "github",
    update_status: "update_available",
    upstream_version: null,
    last_checked_at: null,
  },
  {
    name: "Local stable",
    description: "demo",
    path: "/tmp/b",
    canonical_path: "/tmp/b",
    agent: "Codex",
    is_symlink: false,
    category: null,
    version: null,
    source: null,
    update_capability: "manual",
    update_status: "up_to_date",
    upstream_version: null,
    last_checked_at: null,
  },
  {
    name: "Symlinked stable",
    description: "demo",
    path: "/tmp/c",
    canonical_path: "/tmp/c",
    agent: "Codex",
    is_symlink: true,
    category: null,
    version: null,
    source: null,
    update_capability: "github",
    update_status: "up_to_date",
    upstream_version: null,
    last_checked_at: null,
  },
];

assert.equal(toggleStatusFilter("all", "symlinked"), "symlinked");
assert.equal(toggleStatusFilter("symlinked", "symlinked"), "all");
assert.equal(toggleStatusFilter("local", "updates"), "updates");

assert.deepStrictEqual(
  applyStatusFilter(skills, "all").map((skill) => skill.name),
  ["Symlinked updatable", "Local stable", "Symlinked stable"],
);
assert.deepStrictEqual(
  applyStatusFilter(skills, "symlinked").map((skill) => skill.name),
  ["Symlinked updatable", "Symlinked stable"],
);
assert.deepStrictEqual(
  applyStatusFilter(skills, "local").map((skill) => skill.name),
  ["Local stable"],
);
assert.deepStrictEqual(
  applyStatusFilter(skills, "updates").map((skill) => skill.name),
  ["Symlinked updatable"],
);

assert.deepStrictEqual(getStatusCounts(skills), {
  all: 3,
  symlinked: 2,
  local: 1,
  updates: 1,
});

console.log("skillFilters test passed");
