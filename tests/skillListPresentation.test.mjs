import assert from "node:assert/strict";
import {
  buildSkillPresentation,
} from "../src/lib/skillListPresentation.ts";

const sharedLocal = {
  name: "007",
  description: "Shared security skill",
  path: "/Users/example/SharedSkills/007",
  canonical_path: "/Users/example/SharedSkills/007",
  agent: "Shared Library",
  is_symlink: false,
  category: null,
  version: "1.0.0",
  source: null,
  update_capability: "manual",
  update_status: "up_to_date",
  upstream_version: null,
  last_checked_at: null,
};

const claudeSymlink = {
  ...sharedLocal,
  path: "/Users/example/.claude/skills/007",
  agent: "Claude Code",
  is_symlink: true,
};

const codexSymlink = {
  ...sharedLocal,
  path: "/Users/example/.codex/skills/007",
  agent: "Codex",
  is_symlink: true,
};

const localSkill = {
  ...sharedLocal,
  name: "find-skills",
  description: "Installed locally",
  path: "/Users/example/.claude/skills/find-skills",
  canonical_path: "/Users/example/.claude/skills/find-skills",
  agent: "Claude Code",
  is_symlink: false,
  version: null,
  update_status: "unversioned",
};

const presentedAll = buildSkillPresentation(
  [sharedLocal, claudeSymlink, codexSymlink, localSkill],
  "all",
);

assert.deepStrictEqual(
  presentedAll.skills.map((skill) => [skill.name, skill.agent, skill.is_symlink]),
  [
    ["007", "Shared Library", true],
    ["find-skills", "Claude Code", false],
  ],
);

assert.deepStrictEqual(presentedAll.statusCounts, {
  all: 2,
  symlinked: 1,
  local: 1,
  updates: 0,
});

const presentedSymlinked = buildSkillPresentation(
  [sharedLocal, claudeSymlink, codexSymlink, localSkill],
  "all",
  "symlinked",
);

assert.deepStrictEqual(
  presentedSymlinked.skills.map((skill) => [skill.name, skill.agent, skill.is_symlink]),
  [["007", "Shared Library", true]],
);

const presentedLocal = buildSkillPresentation(
  [sharedLocal, claudeSymlink, codexSymlink, localSkill],
  "all",
  "local",
);

assert.deepStrictEqual(
  presentedLocal.skills.map((skill) => skill.name),
  ["find-skills"],
);

const presentedShared = buildSkillPresentation(
  [sharedLocal, claudeSymlink, codexSymlink, localSkill],
  "Shared Library",
);

assert.deepStrictEqual(
  presentedShared.skills.map((skill) => [skill.name, skill.agent, skill.is_symlink]),
  [["007", "Shared Library", true]],
);

assert.deepStrictEqual(presentedShared.statusCounts, {
  all: 1,
  symlinked: 1,
  local: 0,
  updates: 0,
});

const presentedUnlinkedShared = buildSkillPresentation([sharedLocal], "Shared Library");

assert.deepStrictEqual(
  presentedUnlinkedShared.skills.map((skill) => [skill.name, skill.agent, skill.is_symlink]),
  [["007", "Shared Library", false]],
);

assert.deepStrictEqual(presentedUnlinkedShared.statusCounts, {
  all: 1,
  symlinked: 0,
  local: 1,
  updates: 0,
});

const presentedAgent = buildSkillPresentation(
  [sharedLocal, claudeSymlink, codexSymlink, localSkill],
  "Claude Code",
);

assert.deepStrictEqual(
  presentedAgent.skills.map((skill) => [skill.name, skill.agent, skill.is_symlink]),
  [
    ["007", "Claude Code", true],
    ["find-skills", "Claude Code", false],
  ],
);

console.log("skillListPresentation test passed");
