# Shared Library Filtered Toggle List Design

## Goal

Refine the Shared Library browsing UI so category organization lives inside the Shared Library content area instead of the sidebar.

The revised experience should:

- keep the sidebar flat, with `Shared Library` as a single entry
- add a category filter control in the Shared Library stats bar
- show Shared Library skills as collapsible category groups
- support multi-select category filtering with checkboxes

## Current Context

- The current implementation adds category rows beneath `Shared Library` in the sidebar.
- The topbar title changes to `Shared Library / <Category>`, which turns category selection into navigation instead of filtering.
- Shared Library presentation is still fundamentally a flat list with one optional category filter state.
- Category drag/drop currently targets sidebar category rows.

## Approved Product Decisions

- Category browsing is only a Shared Library concern, not a top-level navigation concern.
- The sidebar must go back to a single `Shared Library` row with no nested categories.
- Shared Library category selection is a filter, not a route or separate page.
- The topbar title should stay `Shared Library`.
- The stats bar should gain a `Category Filter` dropdown on the right side.
- The category filter supports checkbox multi-select.
- The skill list should render as a toggle list / accordion grouped by category.
- Category groups should default to expanded.
- Filtering should narrow which category groups are shown, not flatten the list into a single ungrouped grid.

## Shared Library UI

### Sidebar

- Remove the Shared Library category subtree entirely.
- Keep only the existing top-level rows:
  - `All Skills`
  - `Shared Library`
  - `Claude Code`
  - `Antigravity`
  - `Codex`

### Topbar

When `Shared Library` is active:

- Keep the title as exactly `Shared Library`.
- Keep the existing top-row actions such as `Auto Categorize`, `Check Updates`, and `Update All`.
- In the stats bar row, keep the existing skill/update counters.
- Add a new right-aligned `Category Filter` trigger.

### Category Filter Dropdown

The dropdown should:

- open from the stats bar, to the right of the counters
- list every known Shared Library category with a checkbox and count
- support selecting multiple categories
- include a quick `All Categories` or `Clear` action
- close when clicking outside

Behavior:

- no categories selected means "show all categories"
- one or more categories selected means "show only these categories"
- search and status filters still apply on top of category filtering

## Skill List Presentation

When `Shared Library` is active:

- render skills as category sections
- each section has:
  - category label
  - skill count
  - expand/collapse toggle
- sections default to expanded on first render
- expanded/collapsed state is local UI state and should not be persisted in settings

Section content:

- reuse the existing skill cards inside each category section
- preserve selection, drag behavior, context menu, inline update button, and detail drawer behavior

## Filtering Rules

Shared Library rendering becomes:

1. start from Shared Library skills only
2. apply search filter
3. apply status filter
4. bucket remaining skills by category
5. if category filters are active, keep only matching buckets
6. render remaining buckets as accordion sections

Counts shown in the category dropdown should use Shared Library skills only.

## Drag And Drop

Because categories are no longer in the sidebar:

- Shared Library category reassignment should target category section headers in the content area
- dragging a Shared Library skill onto another category header should move it to that category
- dragging a non-shared skill onto a category header should install it into Shared Library under that category
- dragging onto the main `Shared Library` sidebar row should still place uncategorized items into the Shared Library default flow

This keeps drag/drop aligned with the visible grouped list.

## State Model

Replace the current single-category navigation state with two UI states:

- `selectedSharedCategories: Set<string>` for filter checkboxes
- `collapsedSharedCategories: Set<string>` for accordion section state

These states only affect the Shared Library view.

## Testing

Add or update tests for:

- sidebar no longer rendering category children
- category filter model and default "all categories" behavior
- Shared Library presentation grouped by category
- multi-category filtering
- category accordion collapsed/expanded behavior
- drag target resolution for category section headers instead of sidebar category rows

## Scope

This change intentionally does not add:

- category navigation routes
- persistent saved category filter presets
- moving category filters into the sidebar again
- replacing skill cards with table rows
