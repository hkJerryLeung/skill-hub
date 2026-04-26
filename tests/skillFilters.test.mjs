import assert from "node:assert/strict";
import {
  applyStatusFilter,
  getStatusCounts,
  toggleStatusFilter,
} from "../src/lib/skillFilters.ts";

const skills = [
  {
    name: "Symlinked A",
    description: "demo",
    path: "/tmp/a",
    canonical_path: "/tmp/a",
    agent: "Codex",
    is_symlink: true,
    category: null,
    version: null,
    source: null,
  },
  {
    name: "Local B",
    description: "demo",
    path: "/tmp/b",
    canonical_path: "/tmp/b",
    agent: "Codex",
    is_symlink: false,
    category: null,
    version: null,
    source: null,
  },
  {
    name: "Symlinked C",
    description: "demo",
    path: "/tmp/c",
    canonical_path: "/tmp/c",
    agent: "Codex",
    is_symlink: true,
    category: null,
    version: null,
    source: null,
  },
];

assert.equal(toggleStatusFilter("all", "symlinked"), "symlinked");
assert.equal(toggleStatusFilter("symlinked", "symlinked"), "all");
assert.equal(toggleStatusFilter("local", "all"), "all");

assert.deepStrictEqual(
  applyStatusFilter(skills, "all").map((skill) => skill.name),
  ["Symlinked A", "Local B", "Symlinked C"],
);
assert.deepStrictEqual(
  applyStatusFilter(skills, "symlinked").map((skill) => skill.name),
  ["Symlinked A", "Symlinked C"],
);
assert.deepStrictEqual(
  applyStatusFilter(skills, "local").map((skill) => skill.name),
  ["Local B"],
);

assert.deepStrictEqual(getStatusCounts(skills), {
  all: 3,
  symlinked: 2,
  local: 1,
});

console.log("skillFilters test passed");
