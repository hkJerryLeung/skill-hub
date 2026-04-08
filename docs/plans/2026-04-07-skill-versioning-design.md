# Skill Versioning And Updates Design

## Goal

Add skill version visibility, update prompts, and one-click bulk update support to Skill Gate without turning it into a full package manager.

## Scope

- Read `version:` and `source:` from `SKILL.md` frontmatter.
- Show version and update state in the grid and detail panel.
- Support update checks for GitHub sources.
- Support manual-only hints for non-GitHub external URLs.
- Support one-click update for all GitHub-backed skills with available updates.
- Write remote `version:` back into local `SKILL.md` after a successful update when the upstream defines one.
- Back up files that will be overwritten before applying updates.

## Data Model

`SkillInfo` is extended with:

- `version`
- `source`
- `canonical_path`
- `update_capability`
- `update_status`
- `upstream_version`
- `last_checked_at`

Symlinked installs that resolve to the same real directory share a `canonical_path`, so update checks and updates are deduplicated across agents.

## Update Sources

### GitHub

Supported source formats:

- `https://github.com/<owner>/<repo>`
- `https://github.com/<owner>/<repo>/tree/<ref>/<path>`
- `https://github.com/<owner>/<repo>/blob/<ref>/<path>/SKILL.md`

GitHub-backed skills support:

- update checks
- single-skill update
- bulk update

### External URL

Non-GitHub URLs support:

- best-effort remote `SKILL.md` version check
- update prompt only

They do not support automatic update in this iteration.

### Manual

Values like `community`, `self`, `personal`, missing values, or unparseable sources are treated as manual-only.

## Update Detection

For GitHub skills:

- Resolve the skill directory path from the source URL.
- Read the remote folder contents via GitHub contents API.
- Read remote `SKILL.md` and extract remote version.
- If both local and remote versions exist, compare them.
- If no remote version exists, compare a stable digest derived from the remote folder contents against the cached digest from the last successful check or update.

For external URLs:

- Fetch the URL directly.
- If frontmatter is readable and includes `version:`, show a manual update hint.
- Otherwise mark as manual-only.

## Update Application

For GitHub updates:

1. Fetch the remote folder into a temporary directory.
2. Back up only files that are about to be overwritten into app data backups.
3. Copy remote files over the local canonical skill directory.
4. Preserve local files that do not exist upstream.
5. If upstream defines `version:`, write it back into local `SKILL.md`.
6. Persist update cache metadata.

Backup location:

- `~/Library/Application Support/skill-gate/backups/<timestamp>/<skill-name>/`

Cache location:

- `~/Library/Application Support/skill-gate/update-cache.json`

## UI

### Grid

- Show version pill.
- Show update state pill for available updates or manual-only sources.

### Topbar

- Add `Check Updates` action.
- Add `Update All` action.
- Show update counts in the stats row.

### Detail Panel

- Show version, source, update state, upstream version, and last checked time.
- Add `Check Update` action.
- Add `Update Skill` action for GitHub-backed skills.
- Add `Reveal Backup Folder` later if needed; not required for this pass.

## Safety

- Updates always operate on `canonical_path`.
- Bulk updates run sequentially.
- Local-only extra files are preserved.
- Symlink entries are not updated independently when they point to the same canonical folder.

## Non-Goals

- Full rollback UI
- Editing `version:` or `source:` in-app
- Automatic updates on a schedule
- Authenticated GitHub API support
