import assert from "node:assert/strict";
import { buildBrowserSkillPresentation } from "../src/lib/skillBrowserPresentation.ts";

const sharedFindSkills = {
  name: "find-skills",
  description: "Shared security skill",
  path: "/Volumes/shared/security-systems/find-skills",
  canonical_path: "/Volumes/shared/security-systems/find-skills",
  agent: "Shared Library",
  is_symlink: false,
  category: "security-systems",
  category_assignment_mode: "auto",
  category_confidence: 0.76,
  category_classified_at: "2026-04-08T00:00:00Z",
  version: null,
  source: null,
  update_capability: "manual",
  update_status: "unversioned",
  upstream_version: null,
  last_checked_at: null,
};

const claudeFindSkills = {
  ...sharedFindSkills,
  path: "/Users/example/.claude/skills/find-skills",
  agent: "Claude Code",
  is_symlink: true,
};

const codexFindSkills = {
  ...sharedFindSkills,
  path: "/Users/example/.codex/skills/find-skills",
  agent: "Codex",
  is_symlink: true,
};

const antigravityFindSkills = {
  ...sharedFindSkills,
  path: "/Users/example/.gemini/antigravity/skills/find-skills",
  agent: "Antigravity",
  is_symlink: true,
};

const sharedReact = {
  ...sharedFindSkills,
  name: "vercel-react-best-practices",
  path: "/Volumes/shared/react-best-practices",
  canonical_path: "/Volumes/shared/react-best-practices",
  category: "development-code-tools",
  version: "1.0.0",
  source: "https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices",
  update_capability: "github",
  update_status: "up_to_date",
};

const claudeReact = {
  ...sharedReact,
  path: "/Users/example/.claude/skills/react-best-practices",
  agent: "Claude Code",
  is_symlink: true,
};

const codexReact = {
  ...sharedReact,
  path: "/Users/example/.codex/skills/react-best-practices",
  agent: "Codex",
  is_symlink: true,
};

const antigravityReactLocal = {
  ...sharedReact,
  path: "/Users/example/.gemini/antigravity/skills/react-best-practices",
  canonical_path: "/Users/example/.gemini/antigravity/skills/react-best-practices",
  agent: "Antigravity",
  is_symlink: false,
};

const presentedShared = buildBrowserSkillPresentation(
  [
    sharedFindSkills,
    claudeFindSkills,
    codexFindSkills,
    antigravityFindSkills,
    sharedReact,
    claudeReact,
    codexReact,
    antigravityReactLocal,
  ],
  "Shared Library",
  "",
  "all",
  null,
);

assert.deepStrictEqual(
  presentedShared.skills.map((skill) => [skill.name, skill.is_symlink]),
  [
    ["find-skills", true],
    ["vercel-react-best-practices", true],
  ],
);

assert.deepStrictEqual(presentedShared.statusCounts, {
  all: 2,
  symlinked: 2,
  local: 0,
  updates: 0,
});

const presentedSharedCategory = buildBrowserSkillPresentation(
  [
    sharedFindSkills,
    claudeFindSkills,
    codexFindSkills,
    antigravityFindSkills,
    sharedReact,
    claudeReact,
    codexReact,
    antigravityReactLocal,
  ],
  "Shared Library",
  "",
  "all",
  "security-systems",
);

assert.deepStrictEqual(
  presentedSharedCategory.skills.map((skill) => skill.name),
  ["find-skills"],
);

console.log("skillBrowserPresentation test passed");
