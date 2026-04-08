import assert from "node:assert/strict";
import { getSkillId, matchesInstalledSkill } from "../src/lib/skillIdentity.ts";

const first = {
  agent: "Shared Library",
  name: "duplicate-name",
  path: "/Users/example/SharedSkills/design/duplicate-name",
};

const second = {
  agent: "Shared Library",
  name: "duplicate-name",
  path: "/Users/example/SharedSkills/security/duplicate-name",
};

assert.notStrictEqual(
  getSkillId(first),
  getSkillId(second),
  "skills with different paths must not share the same UI identity",
);

const sourceSkill = {
  name: "copy-me",
  description: "Reusable utility",
  canonical_path: "/Users/example/.claude/skills/copy-me",
  source: null,
  version: null,
};

const copiedSkill = {
  name: "copy-me",
  description: "Reusable utility",
  canonical_path: "/Users/example/.codex/skills/copy-me",
  source: null,
  version: null,
};

const unrelatedSkill = {
  name: "copy-me",
  description: "Different body",
  canonical_path: "/Users/example/.gemini/antigravity/skills/copy-me",
  source: null,
  version: null,
};

assert.equal(
  matchesInstalledSkill(sourceSkill, copiedSkill),
  true,
  "copied skills with matching metadata should count as installed",
);
assert.equal(
  matchesInstalledSkill(sourceSkill, unrelatedSkill),
  false,
  "same-name skills with different metadata must stay distinct",
);

console.log("skillIdentity test passed");
