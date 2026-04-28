import assert from "node:assert/strict";
import {
  areSettingsEqual,
  normalizeStatusFilterForView,
  resolveDefaultInstallTarget,
  resolveInitialBrowserState,
} from "../src/lib/appSettings.ts";

const baseSettings = {
  shared_library_path: "/Users/example/SharedSkills",
  bin_path: "/Users/example/.config/skill-gate/bin",
  theme_mode: "system",
  reduce_motion: false,
  categorization_enabled: false,
  categorization_base_url: "",
  categorization_model: "",
  categorization_api_key: "",
  categorization_confidence_threshold: 0.7,
  startup_view: "Codex",
  startup_status_filter: "local",
  restore_last_session: false,
  confirm_before_uninstall: true,
  confirm_before_batch_migrate: true,
  show_drag_debug_overlay: false,
};

assert.equal(
  normalizeStatusFilterForView("local", "Shared Library"),
  "all",
  "Shared Library view must not start with local-only filters",
);

assert.deepStrictEqual(resolveInitialBrowserState(baseSettings, null), {
  filter: "Codex",
  search: "",
  statusFilter: "local",
});

assert.deepStrictEqual(
  resolveInitialBrowserState(
    {
      ...baseSettings,
      restore_last_session: true,
      startup_view: "Claude Code",
      startup_status_filter: "all",
    },
    {
      filter: "Antigravity",
      search: "security",
      statusFilter: "symlinked",
    },
  ),
  {
    filter: "Antigravity",
    search: "security",
    statusFilter: "symlinked",
  },
);

assert.equal(
  areSettingsEqual(baseSettings, { ...baseSettings }),
  true,
  "equal settings payloads should compare cleanly",
);

assert.equal(
  areSettingsEqual(baseSettings, { ...baseSettings, reduce_motion: true }),
  false,
  "dirty settings payloads must be detectable for Save/Cancel UX",
);

assert.equal(
  areSettingsEqual(baseSettings, {
    ...baseSettings,
    bin_path: "/Volumes/SkillsBin",
  }),
  false,
  "dirty Bin folder changes must be detectable for Save/Cancel UX",
);

assert.equal(
  resolveDefaultInstallTarget([
    { name: "Codex", path: "/Users/example/.codex/skills", exists: true },
    {
      name: "Shared Library",
      path: "/Users/example/SharedSkills",
      exists: true,
    },
  ]),
  "Shared Library",
  "market installs should default to the Shared Library when available",
);

assert.equal(
  resolveDefaultInstallTarget([
    { name: "Bin", path: "/Users/example/.config/skill-gate/bin", exists: true },
    { name: "Codex", path: "/Users/example/.codex/skills", exists: true },
  ]),
  "Codex",
  "market installs should never default to the Bin target",
);

assert.equal(
  resolveDefaultInstallTarget([
    { name: "Bin", path: "/Users/example/.config/skill-gate/bin", exists: true },
  ]),
  "",
  "Bin alone is not an installable target",
);

assert.equal(
  resolveDefaultInstallTarget([
    {
      name: "Claude Code",
      path: "/Users/example/.claude/skills",
      exists: true,
    },
  ]),
  "Claude Code",
  "default install target should fall back to the first available target",
);

console.log("appSettings test passed");
