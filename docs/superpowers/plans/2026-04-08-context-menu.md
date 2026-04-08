# Context Menu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add reusable right-click context menus for sidebar items and skill cards, including batch skill actions and sidebar reveal-folder support.

**Architecture:** Centralize menu state in `App.tsx`, render one reusable floating `ContextMenu` component, and compute menu items from pure helper functions so availability rules stay testable outside the DOM.

**Tech Stack:** React 19, TypeScript, Tauri 2, Node assert-based tests

---

### Task 1: Add failing tests for context-menu item derivation

**Files:**
- Create: `src/lib/contextMenuModel.ts`
- Create: `tests/contextMenuModel.test.mjs`

- [ ] **Step 1: Write the failing test**
- [ ] **Step 2: Run `node tests/contextMenuModel.test.mjs` and verify it fails**
- [ ] **Step 3: Implement minimal pure menu-model helpers**
- [ ] **Step 4: Run `node tests/contextMenuModel.test.mjs` and verify it passes**

### Task 2: Add reusable floating context menu UI

**Files:**
- Create: `src/components/ContextMenu/ContextMenu.tsx`
- Create: `src/components/ContextMenu/ContextMenu.css`

- [ ] **Step 1: Render grouped menu sections**
- [ ] **Step 2: Support icons, danger states, and disabled items**
- [ ] **Step 3: Clamp to viewport and close on outside interactions**

### Task 3: Wire sidebar and skill-card right-click handling

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/Sidebar/Sidebar.tsx`
- Modify: `src/components/SkillGrid/SkillGrid.tsx`

- [ ] **Step 1: Open sidebar context menus for agent/discover/settings items**
- [ ] **Step 2: Open single-skill and batch-skill menus on right click**
- [ ] **Step 3: Route menu actions into existing install/update/move/remove flows**

### Task 4: Verify end to end

**Files:**
- Verify: `tests/contextMenuModel.test.mjs`
- Verify: `tests/*.mjs`
- Verify: `src/App.tsx`

- [ ] **Step 1: Run focused context-menu test**
- [ ] **Step 2: Run all JS tests**
- [ ] **Step 3: Run `cargo test`**
- [ ] **Step 4: Run `npm run build`**
