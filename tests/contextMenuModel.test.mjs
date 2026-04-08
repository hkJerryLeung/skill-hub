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
];

assert.deepStrictEqual(
  buildSidebarAgentMenuItems({
    agent: "Codex",
    targets,
  }).map((item) => item.id),
  ["open", "reveal", "rescan", "check-updates", "update-all"],
);

const singleSkillMenu = buildSkillMenuItems({
  selectedSkills: [
    {
      name: "demo",
      path: "/skills/demo",
      canonical_path: "/skills/demo",
      agent: "Codex",
      is_symlink: false,
      update_capability: "github",
      update_status: "update_available",
    },
  ],
  targets,
});

assert.deepStrictEqual(
  singleSkillMenu.primary.map((item) => item.id),
  ["open-details", "reveal", "check-update", "update-skill"],
);
assert.deepStrictEqual(
  singleSkillMenu.install.map((item) => item.label),
  ["Install to Shared Library", "Install to Claude Code", "Install to Antigravity"],
);
assert.deepStrictEqual(
  singleSkillMenu.move.map((item) => item.label),
  ["Move to Shared Library", "Move to Claude Code", "Move to Antigravity"],
);

const batchSkillMenu = buildSkillMenuItems({
  selectedSkills: [
    {
      name: "demo-a",
      path: "/skills/demo-a",
      canonical_path: "/skills/demo-a",
      agent: "Codex",
      is_symlink: false,
      update_capability: "manual",
      update_status: "unversioned",
    },
    {
      name: "demo-b",
      path: "/skills/demo-b",
      canonical_path: "/skills/demo-b",
      agent: "Codex",
      is_symlink: false,
      update_capability: "manual",
      update_status: "unversioned",
    },
  ],
  targets,
});

assert.equal(batchSkillMenu.primary.length, 0);
assert.deepStrictEqual(
  batchSkillMenu.move.map((item) => item.label),
  ["Move 2 selected to Shared Library", "Move 2 selected to Claude Code", "Move 2 selected to Antigravity"],
);

console.log("contextMenuModel test passed");
