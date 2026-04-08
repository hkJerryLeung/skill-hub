# Shared Library Auto Categorization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add fixed Shared Library categories with LLM-backed auto-classification, manual reassignment by drag-and-drop, and metadata that protects manual category choices.

**Architecture:** Extend the Rust scanner/install pipeline so Shared Library category folders remain the only source of truth while a sidecar metadata file records how the current category was assigned. Update the React sidebar and local-browser presentation so Shared Library can be filtered by category, grouped by category at the root, and used as a category-aware drop target.

**Tech Stack:** React 19 + TypeScript + Vite, Tauri 2, Rust, Node built-in test runner, Cargo test

---

### Task 1: Define Category Metadata And Shared Taxonomy

**Files:**
- Create: `src/lib/sharedLibraryCategories.ts`
- Modify: `src/lib/skillTypes.ts`
- Modify: `src-tauri/src/scanner.rs`
- Test: `tests/sharedLibraryCategories.test.mjs`
- Test: `src-tauri/src/scanner.rs` unit tests

- [ ] **Step 1: Write the failing frontend taxonomy test**

```js
import assert from "node:assert/strict";
import {
  DEFAULT_SHARED_CATEGORY_SLUG,
  SHARED_LIBRARY_CATEGORIES,
  getSharedLibraryCategoryLabel,
  isSharedLibraryCategorySlug,
} from "../src/lib/sharedLibraryCategories.ts";

assert.equal(DEFAULT_SHARED_CATEGORY_SLUG, "uncategorized");
assert.equal(isSharedLibraryCategorySlug("data-analysis"), true);
assert.equal(isSharedLibraryCategorySlug("unknown"), false);
assert.equal(getSharedLibraryCategoryLabel("security-systems"), "Security & Systems");
assert.equal(SHARED_LIBRARY_CATEGORIES.at(-1)?.slug, "uncategorized");

console.log("sharedLibraryCategories test passed");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/sharedLibraryCategories.test.mjs`
Expected: FAIL because `src/lib/sharedLibraryCategories.ts` does not exist yet

- [ ] **Step 3: Write minimal taxonomy module and type additions**

```ts
export const SHARED_LIBRARY_CATEGORIES = [
  { slug: "document-processing", label: "Document Processing" },
  { slug: "development-code-tools", label: "Development & Code Tools" },
  { slug: "data-analysis", label: "Data & Analysis" },
  { slug: "business-marketing", label: "Business & Marketing" },
  { slug: "communication-writing", label: "Communication & Writing" },
  { slug: "creative-media", label: "Creative & Media" },
  { slug: "productivity-organization", label: "Productivity & Organization" },
  { slug: "collaboration-project-management", label: "Collaboration & Project Management" },
  { slug: "security-systems", label: "Security & Systems" },
  { slug: "uncategorized", label: "Uncategorized" },
] as const;
```

```ts
export interface SkillInfo {
  // existing fields...
  category_assignment_mode: "auto" | "manual" | null;
  category_confidence: number | null;
  category_classified_at: string | null;
}
```

```rust
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum CategoryAssignmentMode {
    Auto,
    Manual,
}
```

- [ ] **Step 4: Add Rust parsing tests for sidecar/category validation**

```rust
#[test]
fn category_sidecar_invalid_slug_falls_back_to_none() {
    let metadata = parse_skill_gate_metadata(r#"{"category_assignment":{"mode":"auto","slug":"wrong"}}"#);
    assert!(metadata.category_assignment.is_none());
}
```

- [ ] **Step 5: Run focused tests**

Run: `node --test tests/sharedLibraryCategories.test.mjs && cargo test --manifest-path src-tauri/Cargo.toml scanner::tests::category_sidecar_invalid_slug_falls_back_to_none`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add tests/sharedLibraryCategories.test.mjs src/lib/sharedLibraryCategories.ts src/lib/skillTypes.ts src-tauri/src/scanner.rs
git commit -m "feat: add shared library category metadata"
```

### Task 2: Add Shared Library Categorization Commands And Install Flow

**Files:**
- Modify: `src-tauri/src/scanner.rs`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/src/settings.rs`
- Test: `src-tauri/src/scanner.rs` unit tests

- [ ] **Step 1: Write the failing Rust tests for install and manual move**

```rust
#[test]
fn installing_skill_to_shared_library_without_classifier_places_it_in_uncategorized() {
    // create source skill, install to shared library, then assert destination is SharedSkills/uncategorized/<name>
}

#[test]
fn moving_shared_skill_to_new_category_updates_sidecar_and_relinks_agents() {
    // create shared skill + linked agent symlink, move categories, assert path and symlink target changed
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cargo test --manifest-path src-tauri/Cargo.toml scanner::tests::installing_skill_to_shared_library_without_classifier_places_it_in_uncategorized scanner::tests::moving_shared_skill_to_new_category_updates_sidecar_and_relinks_agents`
Expected: FAIL because commands/helpers do not exist yet

- [ ] **Step 3: Implement category-aware shared install and move helpers**

```rust
pub fn move_shared_skill_to_category(skill_path: &str, category_slug: &str) -> Result<String, String> {
    // validate slug
    // move shared folder
    // write manual sidecar
    // sync shared links for this skill
}
```

```rust
fn resolve_shared_install_category(source_path: &Path, settings: &AppSettings) -> String {
    if !settings.categorization_enabled {
        return String::from("uncategorized");
    }
    String::from("uncategorized")
}
```

- [ ] **Step 4: Add Tauri command surface and new settings fields**

```rust
#[tauri::command]
fn move_shared_skill_to_category(skill_path: String, category_slug: String) -> Result<String, String> {
    scanner::move_shared_skill_to_category(&skill_path, &category_slug)
}
```

```rust
pub struct AppSettings {
    // existing fields...
    pub categorization_enabled: bool,
    pub categorization_base_url: String,
    pub categorization_model: String,
    pub categorization_api_key: String,
    pub categorization_confidence_threshold: u8,
}
```

- [ ] **Step 5: Run focused Rust tests**

Run: `cargo test --manifest-path src-tauri/Cargo.toml scanner::tests::installing_skill_to_shared_library_without_classifier_places_it_in_uncategorized scanner::tests::moving_shared_skill_to_new_category_updates_sidecar_and_relinks_agents`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src-tauri/src/scanner.rs src-tauri/src/lib.rs src-tauri/src/settings.rs
git commit -m "feat: add shared library category commands"
```

### Task 3: Add Shared Library Presentation And Category Filters

**Files:**
- Modify: `src/components/Sidebar/Sidebar.tsx`
- Modify: `src/components/Sidebar/Sidebar.css`
- Modify: `src/lib/dragDropState.ts`
- Modify: `src/lib/skillListPresentation.ts`
- Modify: `src/lib/skillBrowserPresentation.ts`
- Test: `tests/sidebarDropTarget.test.mjs`
- Test: `tests/dragDropState.test.mjs`
- Test: `tests/skillListPresentation.test.mjs`

- [ ] **Step 1: Write failing presentation tests for category filtering and drop targets**

```js
assert.deepStrictEqual(resolveSidebarDropTargetKey("shared-category:data-analysis"), {
  kind: "shared-category",
  category: "data-analysis",
});
```

```js
const presented = buildSkillPresentation(skills, "Shared Library", "all", "security-systems");
assert.deepStrictEqual(presented.skills.map((skill) => skill.name), ["find-skills"]);
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/sidebarDropTarget.test.mjs tests/dragDropState.test.mjs tests/skillListPresentation.test.mjs`
Expected: FAIL because drop targets and category-aware presentation do not exist yet

- [ ] **Step 3: Implement category-aware sidebar targeting and presentation**

```ts
export type DragSidebarTarget =
  | { kind: "agent"; agent: AgentFilter }
  | { kind: "shared-category"; category: SharedLibraryCategorySlug };
```

```ts
export function buildSkillPresentation(
  skills: SkillInfo[],
  agentFilter: string,
  statusFilter: StatusFilter = "all",
  sharedCategory: string | null = null,
) {
  // Shared Library root => grouped by category
  // Shared Library category => flat filtered list
}
```

- [ ] **Step 4: Render Shared Library category children in the sidebar**

```tsx
{a.key === "Shared Library" && sharedCategories.length > 0 ? (
  <div className="sidebar-subtree">
    {sharedCategories.map((category) => (
      <button data-agent-key={`shared-category:${category.slug}`}>{category.label}</button>
    ))}
  </div>
) : null}
```

- [ ] **Step 5: Run focused JS tests**

Run: `node --test tests/sidebarDropTarget.test.mjs tests/dragDropState.test.mjs tests/skillListPresentation.test.mjs tests/skillBrowserPresentation.test.mjs`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/Sidebar/Sidebar.tsx src/components/Sidebar/Sidebar.css src/lib/dragDropState.ts src/lib/skillListPresentation.ts src/lib/skillBrowserPresentation.ts tests/sidebarDropTarget.test.mjs tests/dragDropState.test.mjs tests/skillListPresentation.test.mjs tests/skillBrowserPresentation.test.mjs
git commit -m "feat: add shared library category browsing"
```

### Task 4: Wire Shared Library Category Actions Into The App

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/Topbar/Topbar.tsx`
- Modify: `src/components/DetailPanel/DetailPanel.tsx`
- Modify: `src/lib/contextMenuModel.ts`
- Test: `tests/contextMenuModel.test.mjs`

- [ ] **Step 1: Write failing UI-model tests for category actions**

```js
const menu = buildSidebarAgentMenuItems({ agent: "Shared Library", targets, isSharedLibrary: true });
assert(menu.some((item) => item.id === "auto-categorize"));
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/contextMenuModel.test.mjs`
Expected: FAIL because Shared Library category actions are not exposed yet

- [ ] **Step 3: Implement app state and invoke new Tauri commands**

```tsx
const [sharedCategoryFilter, setSharedCategoryFilter] = useState<string | null>(null);

const handleAutoCategorize = async () => {
  const skillPaths = resolveVisibleSharedSkillPaths();
  const result = await invoke<string>("auto_categorize_shared_skills", { skillPaths });
  showToast(result, "success");
  await refreshSkills({ reloadSelected: true });
};
```

- [ ] **Step 4: Show assignment metadata in the detail panel and topbar**

```tsx
{selected.category_assignment_mode ? (
  <div className="detail-meta-row">
    Category source: {selected.category_assignment_mode}
  </div>
) : null}
```

- [ ] **Step 5: Run focused JS tests**

Run: `node --test tests/contextMenuModel.test.mjs`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx src/components/Topbar/Topbar.tsx src/components/DetailPanel/DetailPanel.tsx src/lib/contextMenuModel.ts tests/contextMenuModel.test.mjs
git commit -m "feat: wire shared library category actions"
```

### Task 5: Verify End-To-End Behavior

**Files:**
- Modify: `docs/superpowers/specs/2026-04-08-shared-library-auto-categorization-design.md` only if implementation diverges and needs correction

- [ ] **Step 1: Run the full JS test set used by this feature**

Run: `node --test tests/sharedLibraryCategories.test.mjs tests/contextMenuModel.test.mjs tests/sidebarDropTarget.test.mjs tests/dragDropState.test.mjs tests/skillListPresentation.test.mjs tests/skillBrowserPresentation.test.mjs`
Expected: PASS

- [ ] **Step 2: Run full Rust tests**

Run: `cargo test --manifest-path src-tauri/Cargo.toml`
Expected: PASS

- [ ] **Step 3: Run the production build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 4: Commit final verification if implementation changed since last task**

```bash
git add -A
git commit -m "test: verify shared library categorization"
```
