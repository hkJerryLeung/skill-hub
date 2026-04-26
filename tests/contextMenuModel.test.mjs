import assert from "node:assert/strict";
import {
  buildSidebarAgentMenuItems,
  buildSkillMenuItems,
} from "../src/lib/contextMenuModel.ts";

const targets = [
  { name: "Shared Library", path: "/shared", exists: true },
  { name: "Claude Code", path: "/claude", exists: true },
  { name: "Antigravity", path: "/antigravity", exists: false },
  { name: "Codex", path: "/codex", exists: true },
  { name: "Cursor", path: "/cursor", exists: false },
];

assert.deepStrictEqual(
  buildSidebarAgentMenuItems({
    agent: "Codex",
    targets,
  }).map((item) => item.id),
  ["open", "reveal", "rescan"],
);

assert.deepStrictEqual(
  buildSidebarAgentMenuItems({
    agent: "Cursor",
    targets,
  }).map((item) => item.id),
  ["open", "reveal", "rescan"],
);

assert.deepStrictEqual(
  buildSidebarAgentMenuItems({
    agent: "Shared Library",
    targets,
  }).map((item) => item.id),
  ["open", "reveal", "rescan", "auto-categorize"],
);

const singleSkillMenu = buildSkillMenuItems({
  selectedSkills: [
    {
      name: "demo",
      path: "/skills/demo",
      canonical_path: "/skills/demo",
      agent: "Codex",
      is_symlink: false,
    },
  ],
});

assert.deepStrictEqual(
  singleSkillMenu.primary.map((item) => item.id),
  ["open-details", "reveal"],
);
assert.deepStrictEqual(
  singleSkillMenu.danger.map((item) => item.id),
  ["remove"],
);
assert.deepStrictEqual(
  Object.keys(singleSkillMenu).sort(),
  ["danger", "primary"],
  "skill menu should only expose primary and danger sections",
);
assert.equal(
  "install" in singleSkillMenu,
  false,
  "skill menu should no longer include an install section",
);
assert.equal(
  "move" in singleSkillMenu,
  false,
  "skill menu should no longer include a move section",
);

const batchSkillMenu = buildSkillMenuItems({
  selectedSkills: [
    {
      name: "demo-a",
      path: "/skills/demo-a",
      canonical_path: "/skills/demo-a",
      agent: "Codex",
      is_symlink: false,
    },
    {
      name: "demo-b",
      path: "/skills/demo-b",
      canonical_path: "/skills/demo-b",
      agent: "Codex",
      is_symlink: false,
    },
  ],
});

assert.equal(batchSkillMenu.primary.length, 0);
assert.equal(batchSkillMenu.danger.length, 0);
assert.deepStrictEqual(
  Object.keys(batchSkillMenu).sort(),
  ["danger", "primary"],
  "batch skill menu should only expose primary and danger sections",
);

console.log("contextMenuModel test passed");
