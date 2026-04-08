# Topbar Status Filter Design

## Goal

Turn the top stats row into a single-select status filter so the user can switch between `All`, `SYMLINKED`, `local`, and `updates available`. Clicking the active option resets the view back to `All`.

## Current Context

The top row is rendered by `src/components/Topbar/Topbar.tsx` and currently only displays summary counts. Actual filtering logic lives in `src/App.tsx`, where the skill list is filtered by the left sidebar agent filter and the search box.

## Proposed Behavior

The top row becomes an interactive segmented filter:

- `skills` acts as the `All` option.
- `SYMLINKED` shows only `is_symlink === true`.
- `local` shows only `is_symlink === false`.
- `updates available` shows only `update_status === "update_available"`.
- Clicking an inactive option enables it.
- Clicking the active option returns the topbar status filter to `All`.

The left sidebar agent filter and search box continue to work as they do now. The new topbar filter is applied after those two inputs.

## Data Flow

Filtering will be split into two stages:

1. `baseFilteredSkills`
   Applies the existing agent filter and search term only.

2. `visibleSkills`
   Applies the topbar status filter on top of `baseFilteredSkills`.

The stats row counts come from `baseFilteredSkills`, not `visibleSkills`. This keeps the row useful as a navigation control because all category counts remain visible even when one category is selected.

## Component Changes

### `src/lib/skillFilters.ts`

Add a focused utility module for:

- defining the topbar status filter type
- toggling the current status filter
- applying the status filter to a list of skills
- deriving the counts shown in the topbar

This keeps the behavior testable without DOM tooling.

### `src/App.tsx`

- add `statusFilter` state
- derive `baseFilteredSkills`
- derive topbar counts from `baseFilteredSkills`
- derive `visibleSkills` from `baseFilteredSkills` + `statusFilter`
- pass the new props into `Topbar`
- pass `visibleSkills` into `SkillGrid`

### `src/components/Topbar/Topbar.tsx`

- convert each stat item from passive text into a button
- highlight the active filter
- route click events back through a new callback prop

### `src/components/Topbar/Topbar.css`

- style the stats row as clickable pills while preserving the current dark visual language
- add hover, focus, and active states

## Error Handling

No new external side effects are introduced. If the status filter yields zero visible skills, the existing empty state in `SkillGrid` will continue to render.

## Testing

Add focused tests for the new utility module:

- toggling from `all` to a specific status
- toggling the active status back to `all`
- filtering symlinked, local, and update-available lists correctly
- preserving topbar counts from the base filtered list

## Scope

This change intentionally does not alter:

- sidebar agent filtering
- search behavior
- detail panel behavior
- update/install logic
