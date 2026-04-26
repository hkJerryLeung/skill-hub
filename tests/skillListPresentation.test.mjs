import assert from "node:assert/strict";
import {
  buildSkillPresentation,
} from "../src/lib/skillListPresentation.ts";

const sharedLocal = {
  name: "007",
  description: "Shared security skill",
  path: "/Users/example/SharedSkills/security-systems/007",
  canonical_path: "/Users/example/SharedSkills/security-systems/007",
  agent: "Shared Library",
  is_symlink: false,
  category: "security-systems",
  category_assignment_mode: "auto",
  category_confidence: 0.85,
  category_classified_at: "2026-04-08T00:00:00Z",
  version: "1.0.0",
  source: null,
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
  category_assignment_mode: null,
  category_confidence: null,
  category_classified_at: null,
  version: null,
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
});
assert.deepStrictEqual(
  presentedShared.sharedCategoryGroups.map((group) => [group.slug, group.skills.map((skill) => skill.name)]),
  [["security-systems", ["007"]]],
);
assert.deepStrictEqual(
  presentedShared.sharedCategoryCounts
    .filter((group) => group.count > 0)
    .map((group) => [group.slug, group.count]),
  [["security-systems", 1]],
);

const presentedSharedCategory = buildSkillPresentation(
  [sharedLocal, claudeSymlink, codexSymlink, localSkill],
  "Shared Library",
  "all",
  new Set(["security-systems"]),
);

assert.deepStrictEqual(
  presentedSharedCategory.skills.map((skill) => skill.name),
  ["007"],
);
assert.deepStrictEqual(
  presentedSharedCategory.sharedCategoryGroups.map((group) => group.slug),
  ["security-systems"],
);

const presentedUnlinkedShared = buildSkillPresentation([sharedLocal], "Shared Library");

assert.deepStrictEqual(
  presentedUnlinkedShared.skills.map((skill) => [skill.name, skill.agent, skill.is_symlink]),
  [["007", "Shared Library", false]],
);
assert.deepStrictEqual(
  presentedUnlinkedShared.sharedCategoryGroups.map((group) => [group.slug, group.skills.length]),
  [["security-systems", 1]],
);

assert.deepStrictEqual(presentedUnlinkedShared.statusCounts, {
  all: 1,
  symlinked: 0,
  local: 1,
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
