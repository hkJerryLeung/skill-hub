# Skill Card Inline Update Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the installed version in the skill card footer and allow `Update Available` on a card to trigger a direct single-skill update with the incoming version in the label.

**Architecture:** Keep the new grid behavior centered in a small presentation helper so label and clickability rules are testable without browser tooling. `App.tsx` remains responsible for invoking the existing update command and tracking a per-skill loading state, while `SkillGrid` only renders the new control and forwards update clicks.

**Tech Stack:** React 19, TypeScript, Vite, Node assert-based tests

---

### Task 1: Add test coverage for inline-update presentation rules

**Files:**
- Modify: `src/lib/updatePresentation.ts`
- Create: `tests/updatePresentation.test.mjs`

- [ ] **Step 1: Write the failing test**

```javascript
import assert from "node:assert/strict";
import {
  canTriggerInlineUpdate,
  getInlineUpdateLabel,
} from "../src/lib/updatePresentation.ts";

const githubUpdate = {
  update_status: "update_available",
  update_capability: "github",
  upstream_version: "1.4.2",
};

assert.equal(canTriggerInlineUpdate(githubUpdate), true);
assert.equal(getInlineUpdateLabel(githubUpdate), "Update to v1.4.2");
assert.equal(
  getInlineUpdateLabel({
    update_status: "update_available",
    update_capability: "github",
    upstream_version: null,
  }),
  "Update Available",
);
assert.equal(
  canTriggerInlineUpdate({
    update_status: "update_available",
    update_capability: "external",
    upstream_version: "2.0.0",
  }),
  false,
);

console.log("updatePresentation test passed");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/updatePresentation.test.mjs`  
Expected: FAIL because the new helper exports do not exist yet

- [ ] **Step 3: Write minimal implementation**

Add helper exports in `src/lib/updatePresentation.ts`:

```typescript
export function canTriggerInlineUpdate(
  skill: Pick<SkillInfo, "update_status" | "update_capability">,
): boolean {
  return skill.update_capability === "github" && skill.update_status === "update_available";
}

export function getInlineUpdateLabel(
  skill: Pick<SkillInfo, "update_status" | "update_capability" | "upstream_version">,
): string | null {
  if (!canTriggerInlineUpdate(skill)) {
    return null;
  }

  return skill.upstream_version
    ? `Update to v${skill.upstream_version}`
    : "Update Available";
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/updatePresentation.test.mjs`  
Expected: PASS with `updatePresentation test passed`

### Task 2: Wire per-card single-update state through `App.tsx`

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add per-card update loading state**

Track the canonical skill currently being updated so only that grid action is disabled while the command is running.

- [ ] **Step 2: Add a grid-level update handler**

Call the existing `update_skill` Tauri command, show the existing toast messages, and refresh skills with detail reload support.

- [ ] **Step 3: Preserve card click behavior**

Do not change existing card selection and detail opening logic when the update button is not clicked.

### Task 3: Render the inline update action and footer version in `SkillGrid`

**Files:**
- Modify: `src/components/SkillGrid/SkillGrid.tsx`
- Modify: `src/components/SkillGrid/SkillGrid.css`

- [ ] **Step 1: Split footer layout into left and right areas**

Keep agent/category on the left and version on the right so the version is visually anchored at the bottom-right.

- [ ] **Step 2: Render inline update button only for auto-updatable cards**

Use the new helper functions to choose between a clickable update button and the existing passive status pill.

- [ ] **Step 3: Stop event propagation on inline update clicks**

Prevent the button from opening the detail panel or affecting selection.

- [ ] **Step 4: Add button and footer styles**

Match the existing dark/red visual language and preserve hover/focus affordances.

### Task 4: Verify the full change

**Files:**
- Test: `tests/updatePresentation.test.mjs`
- Verify: `src/App.tsx`
- Verify: `src/components/SkillGrid/SkillGrid.tsx`

- [ ] **Step 1: Run the new Node test**

Run: `node tests/updatePresentation.test.mjs`  
Expected: PASS

- [ ] **Step 2: Run the production build**

Run: `npm run build`  
Expected: PASS

- [ ] **Step 3: Manually sanity-check behavior in app**

Confirm that:
- skill version sits in the bottom-right footer area
- `Update to vX.Y.Z` appears when upstream version exists
- clicking the inline action updates only that skill and does not open the detail panel
