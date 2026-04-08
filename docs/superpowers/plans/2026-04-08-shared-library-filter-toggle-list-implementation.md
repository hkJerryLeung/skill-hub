# Shared Library Filter Toggle List Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace sidebar category navigation with a Shared Library-only category filter dropdown and accordion category list while preserving update actions, selection, and drag/drop category reassignment.

**Architecture:** Keep category truth in the existing Shared Library metadata and folder layout, but move category browsing state out of sidebar navigation into two local UI sets: selected filter categories and collapsed accordion categories. Extend the presentation layer so Shared Library can return grouped category sections and category counts, then wire those results through the topbar and skill list so drag/drop targets live on category section headers instead of sidebar rows.

**Tech Stack:** React, TypeScript, Tauri, Node `--test`, Rust backend already present but unchanged for this UI correction

---

### Task 1: Revert Sidebar Navigation To A Flat Shared Library Entry

**Files:**
- Modify: `src/components/Sidebar/Sidebar.tsx`
- Test: `tests/sidebarDropTarget.test.mjs`
- Test: `tests/sidebarPointTarget.test.mjs`

- [ ] **Step 1: Write the failing test**

```javascript
assert.equal(resolveSidebarDropTargetKey("Shared Library"), "Shared Library");
assert.equal(resolveSidebarDropTargetKey("shared-category:data-analysis"), null);
assert.equal(
  resolveSidebarTargetFromPoint(
    [
      { agentKey: "all", left: 0, right: 220, top: 0, bottom: 40 },
      { agentKey: "Shared Library", left: 0, right: 220, top: 41, bottom: 80 },
      { agentKey: "Codex", left: 0, right: 220, top: 81, bottom: 120 },
    ],
    { clientX: 120, clientY: 100 },
  ),
  "Codex",
);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/sidebarDropTarget.test.mjs tests/sidebarPointTarget.test.mjs`
Expected: FAIL because `shared-category:*` is still accepted as a sidebar drop target.

- [ ] **Step 3: Write minimal implementation**

```ts
export function resolveSidebarDropTargetKey(
  agentKey: string | null | undefined,
): DragSidebarTarget | null {
  switch (agentKey) {
    case "Shared Library":
    case "Claude Code":
    case "Antigravity":
    case "Codex":
      return agentKey;
    default:
      return null;
  }
}
```

```tsx
interface SidebarProps {
  activeItem: SidebarItem;
  setFilter: (f: AgentFilter) => void;
  onOpenDiscover: (view: DiscoverView) => void;
  onOpenSettings: () => void;
  onAgentContextMenu: (event: React.MouseEvent, agent: AgentFilter) => void;
  onDiscoverContextMenu: (event: React.MouseEvent, view: DiscoverView) => void;
  onSettingsContextMenu: (event: React.MouseEvent) => void;
  countByAgent: (agent: string) => number;
  dragOverTarget: string | null;
  onDragOver: (e: React.DragEvent, key: string) => void;
  onDragLeave: (e: React.DragEvent, key: string) => void;
  onDrop: (e: React.DragEvent, key: string) => void;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/sidebarDropTarget.test.mjs tests/sidebarPointTarget.test.mjs`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/Sidebar/Sidebar.tsx src/lib/dragDropState.ts tests/sidebarDropTarget.test.mjs tests/sidebarPointTarget.test.mjs
git commit -m "fix: flatten shared library sidebar navigation"
```

### Task 2: Add Grouped Shared Library Presentation And Category Filter Model

**Files:**
- Modify: `src/lib/skillBrowserPresentation.ts`
- Modify: `src/lib/skillListPresentation.ts`
- Test: `tests/skillBrowserPresentation.test.mjs`
- Test: `tests/skillListPresentation.test.mjs`

- [ ] **Step 1: Write the failing test**

```javascript
const presentedShared = buildBrowserSkillPresentation(
  [sharedFindSkills, claudeFindSkills, sharedReact, claudeReact],
  "Shared Library",
  "",
  "all",
  new Set(["security-systems", "development-code-tools"]),
);

assert.deepStrictEqual(presentedShared.skills, []);
assert.deepStrictEqual(
  presentedShared.sharedCategoryGroups.map((group) => [group.slug, group.skills.map((skill) => skill.name)]),
  [
    ["security-systems", ["find-skills"]],
    ["development-code-tools", ["vercel-react-best-practices"]],
  ],
);
assert.equal(
  presentedShared.sharedCategoryCounts.find((category) => category.slug === "security-systems")?.count,
  1,
);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/skillBrowserPresentation.test.mjs tests/skillListPresentation.test.mjs`
Expected: FAIL because the presentation layer only returns a flat `skills` list and accepts a single category slug.

- [ ] **Step 3: Write minimal implementation**

```ts
interface SharedCategoryPresentation {
  slug: string;
  label: string;
  skills: SkillInfo[];
}

interface SharedCategoryCount {
  slug: string;
  label: string;
  count: number;
}

interface SkillPresentation {
  skills: SkillInfo[];
  statusCounts: StatusCounts;
  sharedCategoryGroups: SharedCategoryPresentation[];
  sharedCategoryCounts: SharedCategoryCount[];
}
```

```ts
const normalizedSelectedCategories = new Set(selectedSharedCategories);
const visibleGroups = groupedSharedSkills.filter(
  (group) =>
    normalizedSelectedCategories.size === 0 ||
    normalizedSelectedCategories.has(group.slug),
);

return {
  skills: [],
  statusCounts,
  sharedCategoryGroups: visibleGroups,
  sharedCategoryCounts,
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/skillBrowserPresentation.test.mjs tests/skillListPresentation.test.mjs`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/skillBrowserPresentation.ts src/lib/skillListPresentation.ts tests/skillBrowserPresentation.test.mjs tests/skillListPresentation.test.mjs
git commit -m "feat: group shared library presentation by category"
```

### Task 3: Add Shared Library Category Filter UI In The Topbar

**Files:**
- Modify: `src/components/Topbar/Topbar.tsx`
- Modify: `src/components/Topbar/Topbar.css`
- Test: `tests/topbarRefreshMarkup.test.mjs`

- [ ] **Step 1: Write the failing test**

```javascript
assert.match(
  statsBarSource,
  /Category Filter/,
  "Expected Shared Library stats bar to render a category filter trigger",
);
assert.match(
  topbarSource,
  /selectedSharedCategories/,
  "Expected Topbar props to accept selected shared categories",
);
assert.doesNotMatch(
  topbarSource,
  /Shared Library \\/ \\$\\{sharedCategoryLabel\\}/,
  "Topbar title should stay on Shared Library instead of breadcrumbing category navigation",
);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/topbarRefreshMarkup.test.mjs`
Expected: FAIL because the topbar still renders `Shared Library / <Category>` and has no category dropdown.

- [ ] **Step 3: Write minimal implementation**

```tsx
{filter === "Shared Library" && (
  <div className="stats-bar-actions">
    <div className={`category-filter ${categoryFilterOpen ? "open" : ""}`}>
      <button type="button" className="category-filter-trigger" onClick={toggleCategoryFilter}>
        Category Filter
      </button>
      {categoryFilterOpen && (
        <div className="category-filter-menu">
          <button type="button" className="category-filter-clear" onClick={onClearSharedCategories}>
            All Categories
          </button>
        </div>
      )}
    </div>
    <button type="button" className={`stats-refresh-btn ${refreshing ? "spinning" : ""}`} />
  </div>
)}
```

```tsx
const title = filter === "all" ? "All Skills" : filter;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/topbarRefreshMarkup.test.mjs`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/Topbar/Topbar.tsx src/components/Topbar/Topbar.css tests/topbarRefreshMarkup.test.mjs
git commit -m "feat: add shared library category filter dropdown"
```

### Task 4: Render Shared Library Categories As Accordion Sections And Move Drag Targets Into Content

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/SkillGrid/SkillGrid.tsx`
- Modify: `src/components/SkillGrid/SkillGrid.css`
- Modify: `src/lib/dragDropState.ts`
- Test: `tests/skillBrowserPresentation.test.mjs`
- Test: `tests/skillListPresentation.test.mjs`
- Test: `tests/sidebarDropTarget.test.mjs`
- Test: `tests/sidebarPointTarget.test.mjs`

- [ ] **Step 1: Write the failing test**

```javascript
assert.deepStrictEqual(
  presentedShared.sharedCategoryGroups.map((group) => group.slug),
  ["security-systems", "development-code-tools"],
);
assert.equal(
  buildBrowserSkillPresentation(
    [sharedFindSkills, sharedReact],
    "Shared Library",
    "",
    "all",
    new Set(["security-systems"]),
  ).sharedCategoryGroups.length,
  1,
);
```

```ts
const [selectedSharedCategories, setSelectedSharedCategories] = useState<Set<string>>(new Set());
const [collapsedSharedCategories, setCollapsedSharedCategories] = useState<Set<string>>(new Set());
```

```tsx
<SkillGrid
  sharedCategoryGroups={sharedCategoryGroups}
  collapsedSharedCategories={collapsedSharedCategories}
  onToggleSharedCategory={toggleSharedCategoryCollapsed}
  onSharedCategoryDragOver={handleSharedCategoryDragOver}
  onSharedCategoryDrop={handleSharedCategoryDrop}
/>
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/skillBrowserPresentation.test.mjs tests/skillListPresentation.test.mjs tests/sidebarDropTarget.test.mjs tests/sidebarPointTarget.test.mjs`
Expected: FAIL until Shared Library rendering switches from a flat card grid to grouped accordion sections and drag state stops depending on sidebar category keys.

- [ ] **Step 3: Write minimal implementation**

```tsx
{isSharedLibraryView ? (
  <div className="shared-category-list">
    {sharedCategoryGroups.map((group) => {
      const collapsed = collapsedSharedCategories.has(group.slug);
      return (
        <section key={group.slug} className="shared-category-section">
          <button
            type="button"
            className={`shared-category-header ${dragOverCategory === group.slug ? "drag-over" : ""}`}
            onClick={() => onToggleSharedCategory(group.slug)}
            onDragOver={(event) => onSharedCategoryDragOver(event, group.slug)}
            onDrop={(event) => onSharedCategoryDrop(event, group.slug)}
          >
            <span>{group.label}</span>
            <span>{group.skills.length}</span>
          </button>
          {!collapsed && <div className="skill-grid">{renderSkillCards(group.skills)}</div>}
        </section>
      );
    })}
  </div>
) : (
  <div className="skill-grid">{renderSkillCards(filtered)}</div>
)}
```

```ts
const handleSharedCategoryDrop = async (event: React.DragEvent, slug: string) => {
  event.preventDefault();
  await migrateDraggedSkills(`shared-category:${slug}`, { allowSelectedFallback: true });
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/*.test.mjs`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/components/SkillGrid/SkillGrid.tsx src/components/SkillGrid/SkillGrid.css src/lib/dragDropState.ts tests/*.test.mjs
git commit -m "feat: render shared library categories as accordion sections"
```

### Task 5: Verify The Full UI Correction

**Files:**
- Modify: `docs/superpowers/specs/2026-04-08-shared-library-filtered-toggle-list-design.md`
- Modify: `docs/superpowers/plans/2026-04-08-shared-library-filter-toggle-list-implementation.md`

- [ ] **Step 1: Run frontend tests**

Run: `node --test tests/*.test.mjs`
Expected: PASS with updated Shared Library presentation coverage.

- [ ] **Step 2: Run Rust tests to guard regressions**

Run: `cargo test --manifest-path src-tauri/Cargo.toml`
Expected: PASS with no backend regressions.

- [ ] **Step 3: Run production build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 4: Inspect git diff for scope control**

Run: `git status --short && git diff --stat`
Expected: Only the Shared Library UI correction files and docs appear.

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/specs/2026-04-08-shared-library-filtered-toggle-list-design.md docs/superpowers/plans/2026-04-08-shared-library-filter-toggle-list-implementation.md
git commit -m "docs: capture shared library filter toggle list plan"
```
