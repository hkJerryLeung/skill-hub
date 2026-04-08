# Skill Card Inline Update Design

## Goal

Refine the skill card so version information is anchored in the bottom-right area and an available update can be triggered directly from the card while exposing the incoming upstream version.

## Scope

- Keep the existing topbar update controls unchanged.
- Keep the detail panel update controls unchanged.
- Show the installed skill version in the card footer area.
- Turn the grid-level `Update Available` state into a direct single-skill update action for auto-updatable skills.
- Show the upstream target version in the grid action text when it is known.

## Interaction Design

### Card Footer

- The footer keeps agent and category on the left.
- The right side shows the installed version using the existing local version metadata.
- If the skill has no local version, show `Unversioned`.

### Inline Update Action

- If a skill is GitHub-backed and its status is `update_available`, the grid renders an action button instead of a passive update badge.
- The action label is:
  - `Update to v<upstream_version>` when `upstream_version` is known
  - `Update Available` when the upstream version is missing
- Clicking the action updates only that skill.
- The action must stop event propagation so it does not also open the detail panel.
- While a single-skill update is in progress, the action is disabled for that card.

### Non-Updatable States

- Non-GitHub skills keep their current passive status pill behavior.
- `Up To Date`, `Manual Source`, `Manual Only`, `Unversioned`, and `Check Failed` remain display-only in the grid.

## Data And Backend

- Reuse existing `version`, `update_status`, `update_capability`, and `upstream_version` fields.
- Reuse the existing single-skill update backend command; no backend API changes are required for this pass.

## Testing

- Add a small presentation helper that computes the grid action label and whether it is clickable.
- Cover that helper with Node-based tests so the new label rules are locked down.

## Non-Goals

- Automatic background updating
- Changing the topbar update flow
- Adding new remote version lookup behavior
