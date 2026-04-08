# Topbar Status Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the top stats row into a single-select filter for `All`, `SYMLINKED`, `local`, and `updates available`, with a second click on the active option resetting to `All`.

**Architecture:** Keep the new behavior in a small pure utility module so the filtering rules and toggle logic are testable without browser tooling. `App.tsx` remains the composition layer that derives base-filtered skills, topbar counts, and final visible skills, while `Topbar` stays responsible for rendering the interactive controls.

**Tech Stack:** React 19, TypeScript, Vite, Node assert-based tests

---

### Task 1: Add a testable status-filter utility

**Files:**
- Create: `src/lib/skillFilters.ts`
- Test: `tests/skillFilters.test.mjs`

- [ ] **Step 1: Write the failing test**

```javascript
import assert from "node:assert/strict";
import {
  applyStatusFilter,
  getStatusCounts,
  toggleStatusFilter,
} from "../src/lib/skillFilters.ts";

const skills = [
  {
    name: "Symlinked updatable",
    description: "demo",
    path: "/tmp/a",
    canonical_path: "/tmp/a",
    agent: "Codex",
    is_symlink: true,
    category: null,
    version: null,
    source: null,
    update_capability: "github",
    update_status: "update_available",
    upstream_version: null,
    last_checked_at: null,
  },
  {
    name: "Local stable",
    description: "demo",
    path: "/tmp/b",
    canonical_path: "/tmp/b",
    agent: "Codex",
    is_symlink: false,
    category: null,
    version: null,
    source: null,
    update_capability: "manual",
    update_status: "up_to_date",
    upstream_version: null,
    last_checked_at: null,
  },
];

assert.equal(toggleStatusFilter("all", "symlinked"), "symlinked");
assert.equal(toggleStatusFilter("symlinked", "symlinked"), "all");
assert.deepStrictEqual(
  applyStatusFilter(skills, "local").map((skill) => skill.name),
  ["Local stable"],
);
assert.deepStrictEqual(getStatusCounts(skills), {
  all: 2,
  symlinked: 1,
  local: 1,
  updates: 1,
});

console.log("skillFilters test passed");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/skillFilters.test.mjs`
Expected: FAIL because `../src/lib/skillFilters.ts` does not exist yet

- [ ] **Step 3: Write minimal implementation**

```typescript
import { SkillInfo } from "./skillTypes";

export type StatusFilter = "all" | "symlinked" | "local" | "updates";

export const toggleStatusFilter = (
  current: StatusFilter,
  next: StatusFilter,
): StatusFilter => (current === next ? "all" : next);

export const applyStatusFilter = (
  skills: SkillInfo[],
  filter: StatusFilter,
): SkillInfo[] => {
  switch (filter) {
    case "symlinked":
      return skills.filter((skill) => skill.is_symlink);
    case "local":
      return skills.filter((skill) => !skill.is_symlink);
    case "updates":
      return skills.filter((skill) => skill.update_status === "update_available");
    default:
      return skills;
  }
};

export const getStatusCounts = (skills: SkillInfo[]) => ({
  all: skills.length,
  symlinked: skills.filter((skill) => skill.is_symlink).length,
  local: skills.filter((skill) => !skill.is_symlink).length,
  updates: skills.filter((skill) => skill.update_status === "update_available").length,
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/skillFilters.test.mjs`
Expected: PASS with `skillFilters test passed`

### Task 2: Wire the new filter through `App.tsx`

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/Topbar/Topbar.tsx`

- [ ] **Step 1: Add status-filter state and derived lists**

```typescript
const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

const baseFilteredSkills = skills.filter((s) => {
  const matchAgent = filter === "all" || s.agent === filter;
  const matchSearch =
    search === "" ||
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.description.toLowerCase().includes(search.toLowerCase());
  return matchAgent && matchSearch;
});

const statusCounts = getStatusCounts(baseFilteredSkills);
const visibleSkills = applyStatusFilter(baseFilteredSkills, statusFilter);
```

- [ ] **Step 2: Add topbar click handling**

```typescript
const handleStatusFilterChange = (nextFilter: StatusFilter) => {
  setStatusFilter((current) => toggleStatusFilter(current, nextFilter));
};
```

- [ ] **Step 3: Pass the new props into `Topbar` and `SkillGrid`**

```typescript
<Topbar
  ...
  statusFilter={statusFilter}
  statusCounts={statusCounts}
  onStatusFilterChange={handleStatusFilterChange}
/>

<SkillGrid filtered={visibleSkills} ... />
```

- [ ] **Step 4: Keep existing feature scope unchanged**

No changes to selection, drag/drop, updates, installs, or detail-panel loading behavior.

### Task 3: Make the topbar stats row interactive and styled

**Files:**
- Modify: `src/components/Topbar/Topbar.tsx`
- Modify: `src/components/Topbar/Topbar.css`

- [ ] **Step 1: Render stat buttons instead of passive stat divs**

```tsx
<button
  type="button"
  className={`stat-item ${statusFilter === "symlinked" ? "active" : ""}`}
  onClick={() => onStatusFilterChange("symlinked")}
>
  <span className="stat-value">{statusCounts.symlinked}</span> SYMLINKED
</button>
```

- [ ] **Step 2: Repeat for `all`, `local`, and `updates`**

Use the same pattern so the whole row behaves like a segmented filter.

- [ ] **Step 3: Add active, hover, and focus states in CSS**

```css
.stat-item {
  appearance: none;
  border: 1px solid transparent;
  background: transparent;
  cursor: pointer;
}

.stat-item.active {
  border-color: rgba(153, 0, 17, 0.4);
  background: rgba(153, 0, 17, 0.16);
  color: var(--text-primary);
}
```

- [ ] **Step 4: Keep the existing dark theme and spacing**

Preserve the current topbar density so the interaction upgrade does not create a larger layout shift.

### Task 4: Verify the change end to end

**Files:**
- Test: `tests/skillFilters.test.mjs`
- Verify: `src/App.tsx`
- Verify: `src/components/Topbar/Topbar.tsx`
- Verify: `src/components/Topbar/Topbar.css`

- [ ] **Step 1: Run the new focused test**

Run: `node tests/skillFilters.test.mjs`
Expected: PASS

- [ ] **Step 2: Run the existing lightweight regression tests**

Run: `node tests/dragDropState.test.mjs && node tests/dragEndFallback.test.mjs && node tests/migrationBatch.test.mjs && node tests/skillIdentity.test.mjs`
Expected: PASS messages from each test file

- [ ] **Step 3: Run the production build**

Run: `npm run build`
Expected: TypeScript compile succeeds and Vite build exits with code 0

- [ ] **Step 4: Inspect final diff**

Run: `git diff -- src/App.tsx src/components/Topbar/Topbar.tsx src/components/Topbar/Topbar.css src/lib/skillFilters.ts tests/skillFilters.test.mjs docs/superpowers/specs/2026-04-08-topbar-status-filter-design.md docs/superpowers/plans/2026-04-08-topbar-status-filter.md`
Expected: Only the new topbar-filter feature changes appear in the reviewed files
