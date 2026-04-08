# Settings Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persistent app settings page with a lower-left sidebar entry, including configurable Shared Library folder support and fully functional desktop settings controls.

**Architecture:** Add a small Tauri settings persistence module and keep the frontend settings form in a dedicated `SettingsView` component. `App.tsx` remains the composition layer for bootstrap, skill browsing, settings draft state, and post-save refresh behavior.

**Tech Stack:** Tauri 2, Rust, React 19, TypeScript, Vite, Node assert-based tests

---

### Task 1: Add failing tests for settings bootstrap logic

**Files:**
- Create: `tests/appSettings.test.mjs`
- Create: `src/lib/appSettings.ts`

- [ ] **Step 1: Write the failing test**
- [ ] **Step 2: Run `node tests/appSettings.test.mjs` and verify it fails**
- [ ] **Step 3: Implement minimal frontend settings helpers**
- [ ] **Step 4: Run `node tests/appSettings.test.mjs` and verify it passes**

### Task 2: Add Tauri settings persistence and Shared Library path support

**Files:**
- Create: `src-tauri/src/settings.rs`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/src/scanner.rs`
- Modify: `src-tauri/src/update_manager.rs`

- [ ] **Step 1: Add failing Rust tests for settings defaults and path normalization**
- [ ] **Step 2: Run `cargo test settings` and verify it fails**
- [ ] **Step 3: Implement settings/session/app-info commands and Shared Library path lookup**
- [ ] **Step 4: Run `cargo test settings` and verify it passes**

### Task 3: Build the settings UI and sidebar navigation

**Files:**
- Create: `src/components/SettingsView/SettingsView.tsx`
- Create: `src/components/SettingsView/SettingsView.css`
- Modify: `src/components/Sidebar/Sidebar.tsx`
- Modify: `src/components/Sidebar/Sidebar.css`
- Modify: `src/components/Icons/Icons.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles/global.css`

- [ ] **Step 1: Add the lower-left sidebar settings entry and browsing/settings view state**
- [ ] **Step 2: Implement the settings form sections and action buttons**
- [ ] **Step 3: Wire Save / Cancel, folder picker, and refresh actions**
- [ ] **Step 4: Apply saved theme/reduced-motion settings to the document**

### Task 4: Hook runtime behaviors to saved settings

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Respect confirm settings for uninstall and batch migrate**
- [ ] **Step 2: Respect auto-check-on-launch and restore-last-session behavior**
- [ ] **Step 3: Hide drag debug overlay unless enabled**
- [ ] **Step 4: Refresh skill data and targets after settings save**

### Task 5: Verify end to end

**Files:**
- Verify: `tests/appSettings.test.mjs`
- Verify: `tests/*.mjs`
- Verify: `src-tauri/src/settings.rs`
- Verify: `src/App.tsx`
- Verify: `src/components/SettingsView/SettingsView.tsx`

- [ ] **Step 1: Run focused frontend tests**
- [ ] **Step 2: Run Rust tests**
- [ ] **Step 3: Run existing JS regression tests**
- [ ] **Step 4: Run `npm run build`**
