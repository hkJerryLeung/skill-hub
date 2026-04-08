# Shared Library Auto Categorization Design

## Goal

Add first-class categories inside `Shared Library` so Skill Hub can:

- automatically assign exactly one primary category to a skill by reading its content with an LLM
- physically store the skill inside that category folder
- let the user manually drag the skill into a different category later
- preserve manual moves as the source of truth

## Current Context

- The backend already supports one level of Shared Library category folders in `src-tauri/src/scanner.rs`.
- `SkillInfo.category` is currently derived from the folder path, not from metadata.
- The frontend already shows a category badge on skill cards in `src/components/SkillGrid/SkillGrid.tsx`.
- `Shared Library` installs currently infer category only from an already-known source path and do not classify content.
- Sidebar drag-and-drop only targets top-level agents in `src/components/Sidebar/Sidebar.tsx` and `src/lib/dragDropState.ts`.
- Shared skills are linked into agent folders via symlinks, so moving a shared skill to a new category changes its real path and must repair those symlinks.

## Approved Product Decisions

- Each skill has exactly one primary category.
- The category source of truth is the physical folder path under `Shared Library`.
- Automatic categorization runs only when:
  - a skill is installed/imported into `Shared Library`
  - the user explicitly runs `Auto Categorize`
- Manual category changes move the real folder and override future automatic recategorization.
- The first version uses a fixed curated taxonomy inspired by `awesome-claude-skills`, not free-form category creation.
- Any uncertain or failed classification falls back to `uncategorized`.

## Taxonomy

Use stable folder slugs and separate display labels:

- `document-processing` -> `Document Processing`
- `development-code-tools` -> `Development & Code Tools`
- `data-analysis` -> `Data & Analysis`
- `business-marketing` -> `Business & Marketing`
- `communication-writing` -> `Communication & Writing`
- `creative-media` -> `Creative & Media`
- `productivity-organization` -> `Productivity & Organization`
- `collaboration-project-management` -> `Collaboration & Project Management`
- `security-systems` -> `Security & Systems`
- `uncategorized` -> `Uncategorized`

This list should live in one shared definition on the backend and one mirrored definition on the frontend. The slug is the persisted folder name. The label is UI-only.

## Data Model

### Folder Layout

`Shared Library` becomes:

```text
SharedSkills/
  development-code-tools/
    skill-a/
      SKILL.md
      .skill-hub.json
  data-analysis/
    skill-b/
      SKILL.md
      .skill-hub.json
  uncategorized/
    skill-c/
```

### Sidecar Metadata

Add an optional `.skill-hub.json` file inside each shared skill directory. This file does not define the live category. It only records assignment metadata and protects manual moves from later batch runs.

Suggested shape:

```json
{
  "category_assignment": {
    "mode": "auto",
    "slug": "development-code-tools",
    "taxonomy_version": 1,
    "confidence": 0.82,
    "model": "configured-model-id",
    "classified_at": "2026-04-08T12:34:56Z",
    "reason": "Primary focus is coding workflow automation and repo operations."
  }
}
```

Rules:

- `mode = manual` means the user explicitly moved the skill.
- The folder path still wins if this file disagrees with the current directory.
- Missing sidecar metadata is valid and should not break scanning.

### SkillInfo Extension

Extend `SkillInfo` with optional category metadata for UI display:

- `category_assignment_mode: "auto" | "manual" | null`
- `category_confidence: number | null`
- `category_classified_at: string | null`

This keeps scan results self-contained enough for badges, detail panels, and batch-action rules.

## LLM Categorization Pipeline

### Classification Inputs

The classifier should read a bounded subset of each skill:

- `SKILL.md` frontmatter
- the first useful sections of `SKILL.md` after frontmatter
- the root file list
- optional `README.md` first section if present

Do not send the whole skill directory. Cap input size so batch runs stay predictable.

### Prompt Contract

The prompt should:

- include the fixed taxonomy with slug + label + short descriptions
- instruct the model to return exactly one slug from the whitelist
- require strict JSON output with:
  - `category_slug`
  - `confidence`
  - `reason`
- use deterministic settings such as low temperature

If parsing fails, the slug is not in the whitelist, or confidence is below the threshold, classify the skill as `uncategorized`.

### Provider Boundary

Implement categorization behind a small backend client abstraction. The first version should target an OpenAI-compatible JSON API so cloud providers and local model servers can both work with the same integration shape.

Add categorization settings to `AppSettings`:

- `categorization_enabled: bool`
- `categorization_base_url: string`
- `categorization_model: string`
- `categorization_api_key: string`
- `categorization_confidence_threshold: number`

The first version may store these values in the existing settings file for simplicity. Keychain storage is explicitly out of scope for this design.

## Install And Import Flow

When the target is `Shared Library`:

1. Read the skill contents from the source directory.
2. If categorization is enabled, ask the classifier for one taxonomy slug.
3. If categorization is disabled or fails, use `uncategorized`.
4. Copy or move the skill into `SharedSkills/<slug>/<skill-name>`.
5. Write `.skill-hub.json` with `mode = auto`.
6. Re-link matching agent installs using the existing shared-library sync flow.

This replaces the current `infer_skill_category` behavior for new Shared Library installs.

## Manual Reassignment

Manual reassignment changes the real path, not just metadata.

When the user drags a shared skill onto another category:

1. Move the folder from `SharedSkills/<old>/<skill-name>` to `SharedSkills/<new>/<skill-name>`.
2. Update `.skill-hub.json` to `mode = manual` and the new slug.
3. Re-run shared-library link sync for that skill name so agent symlinks point to the new location.

Dragging onto the root `Shared Library` item moves the skill into `SharedSkills/uncategorized/<skill-name>`.

## Batch Auto Categorize

Add a user-triggered `Auto Categorize` action for Shared Library.

Rules:

- If skills are selected, operate on the selected shared skills.
- If nothing is selected, operate on the currently visible shared skills.
- Skip any skill whose sidecar says `mode = manual`.
- Reclassify skills whose sidecar is missing or `mode = auto`.
- If the new slug differs from the current folder, move the folder and repair symlinks.
- Return a summary message with counts for:
  - recategorized
  - unchanged
  - skipped manual
  - failed

This action must never run implicitly during normal refresh or scan.

## UI Design

## Sidebar

Keep the existing top-level agent list. Add a Shared Library category section under the `Shared Library` row:

- `Shared Library` means all shared skills
- each taxonomy category appears as a child row with a badge count
- child rows are valid drag targets
- clicking a child row filters Shared Library to that category

This keeps the agent mental model intact while giving users a stable place to drop skills.

## Shared Library View

When `Shared Library` is active:

- the topbar shows the active category filter
- add an `Auto Categorize` button
- if `Shared Library` root is selected, render the grid grouped by category
- if a specific category row is selected, render that category as a flat grid

Skill cards keep the category badge. The detail panel should also show whether the category was assigned automatically or manually, plus confidence for automatic assignments when available.

## Drag And Drop

Extend drag target types beyond top-level agents:

- existing agent targets remain unchanged
- add a dedicated shared-category target with a category slug

Behavior:

- dragging a non-shared skill onto a shared category imports it into that category directly and records `mode = manual`
- dragging a non-shared skill onto the root `Shared Library` target follows the normal auto-categorize-on-install flow
- dragging a shared skill onto another shared category reassigns it in place
- dragging a shared skill onto a non-shared agent keeps the existing "move out of shared library" behavior

## Context And Empty States

Add lightweight explanations where needed:

- if categorization is disabled, `Auto Categorize` is disabled with a settings hint
- if a category has no skills, show an empty state that still accepts drops
- if a classification fails, show a toast and place the skill in `Uncategorized`

## Backend Commands

Add Tauri commands for the new behaviors:

- `get_shared_library_categories()`
- `move_shared_skill_to_category(skill_path, category_slug)`
- `auto_categorize_shared_skills(skill_paths)`

`scan_skills` remains the main read path, but it now also reads `.skill-hub.json` when present.

## Error Handling

- If the model response is invalid, fall back to `uncategorized`.
- If the destination folder already exists, fail that skill and keep the current location unchanged.
- If relinking agent symlinks fails after a move, surface the error and leave the skill in its new category rather than trying to roll back partially.
- If the user has manually moved a folder in Finder, scan should trust the path-derived category even if `.skill-hub.json` is stale.

## Testing

Add focused coverage for:

- taxonomy slug validation and fallback to `uncategorized`
- sidecar metadata read/write
- install-to-shared flow writes auto metadata
- moving a shared skill to another category repairs linked agent symlinks
- batch auto categorize skips manual assignments
- sidebar category presentation and counts
- drag target resolution for shared categories
- Shared Library grouped presentation by category

Run focused JS tests, Rust tests, and a production build before implementation is considered complete.

## Scope

This change intentionally does not add:

- user-defined arbitrary categories
- multiple categories per skill
- automatic recategorization on every scan or refresh
- embedding-based hybrid classification
- keychain-backed secret storage
