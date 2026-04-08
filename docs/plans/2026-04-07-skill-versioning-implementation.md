# Skill Versioning And Updates Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add skill version metadata, update prompts, and one-click GitHub-backed bulk updates to Skill Gate.

**Architecture:** Extend the Rust scanner to parse frontmatter and merge persisted update cache data into `SkillInfo`. Add a new Rust update workflow that resolves GitHub sources, checks remote metadata, downloads remote skill folders, backs up overwritten files, and writes remote versions back into local `SKILL.md`. Then extend the React UI to surface version and update state in the topbar, grid, and detail panel.

**Tech Stack:** Tauri 2, Rust, React 19, TypeScript, GitHub contents API, reqwest, serde_json

---

### Task 1: Define backend metadata and cache types

**Files:**
- Create: `src-tauri/src/update_manager.rs`
- Modify: `src-tauri/src/scanner.rs`
- Test: `src-tauri/src/update_manager.rs`

**Step 1: Write the failing test**

Add tests for:

- parsing frontmatter `version` and `source`
- classifying update capability from source
- preserving canonical path for symlinks

**Step 2: Run test to verify it fails**

Run: `cargo test metadata --manifest-path src-tauri/Cargo.toml`

Expected: FAIL because the new metadata helpers do not exist yet.

**Step 3: Write minimal implementation**

Add metadata parsing helpers and new `SkillInfo` fields.

**Step 4: Run test to verify it passes**

Run: `cargo test metadata --manifest-path src-tauri/Cargo.toml`

Expected: PASS

### Task 2: Add GitHub source resolution and remote digest checks

**Files:**
- Modify: `src-tauri/src/update_manager.rs`
- Test: `src-tauri/src/update_manager.rs`

**Step 1: Write the failing test**

Add tests for:

- parsing supported GitHub source shapes
- deriving the skill directory path
- computing update status from local version, remote version, and folder digest

**Step 2: Run test to verify it fails**

Run: `cargo test github --manifest-path src-tauri/Cargo.toml`

Expected: FAIL because the GitHub resolution and status logic is missing.

**Step 3: Write minimal implementation**

Implement GitHub source parsing and update status comparison helpers.

**Step 4: Run test to verify it passes**

Run: `cargo test github --manifest-path src-tauri/Cargo.toml`

Expected: PASS

### Task 3: Implement persisted update cache and update commands

**Files:**
- Modify: `src-tauri/src/update_manager.rs`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/Cargo.toml`
- Test: `src-tauri/src/update_manager.rs`

**Step 1: Write the failing test**

Add tests for:

- loading empty cache safely
- saving and reloading cache entries
- merging cached data into scanned skills

**Step 2: Run test to verify it fails**

Run: `cargo test cache --manifest-path src-tauri/Cargo.toml`

Expected: FAIL because cache persistence is missing.

**Step 3: Write minimal implementation**

Implement cache read/write helpers and expose Tauri commands for check/update operations.

**Step 4: Run test to verify it passes**

Run: `cargo test cache --manifest-path src-tauri/Cargo.toml`

Expected: PASS

### Task 4: Implement safe update application with backups

**Files:**
- Modify: `src-tauri/src/update_manager.rs`
- Test: `src-tauri/src/update_manager.rs`

**Step 1: Write the failing test**

Add tests for:

- copying remote files into a local skill directory
- preserving local-only files
- backing up overwritten files
- writing upstream version back into local `SKILL.md`

**Step 2: Run test to verify it fails**

Run: `cargo test apply_update --manifest-path src-tauri/Cargo.toml`

Expected: FAIL because update application is missing.

**Step 3: Write minimal implementation**

Implement file backup and update application helpers.

**Step 4: Run test to verify it passes**

Run: `cargo test apply_update --manifest-path src-tauri/Cargo.toml`

Expected: PASS

### Task 5: Surface update state in the frontend

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/Topbar/Topbar.tsx`
- Modify: `src/components/Topbar/Topbar.css`
- Modify: `src/components/SkillGrid/SkillGrid.tsx`
- Modify: `src/components/SkillGrid/SkillGrid.css`
- Modify: `src/components/DetailPanel/DetailPanel.tsx`
- Modify: `src/components/DetailPanel/DetailPanel.css`
- Modify: `src/components/Icons/Icons.tsx`

**Step 1: Write the failing test**

Use TypeScript build errors as the red step by referencing the new fields and handlers before they exist.

**Step 2: Run test to verify it fails**

Run: `npm run build`

Expected: FAIL because the frontend does not yet handle the new data and commands.

**Step 3: Write minimal implementation**

Add topbar actions, update pills, detail panel update controls, and loading states.

**Step 4: Run test to verify it passes**

Run: `npm run build`

Expected: PASS

### Task 6: End-to-end verification

**Files:**
- Modify: `README.md`

**Step 1: Run backend verification**

Run: `cargo test --manifest-path src-tauri/Cargo.toml`

Expected: PASS

**Step 2: Run frontend verification**

Run: `npm run build`

Expected: PASS

**Step 3: Update docs**

Add README notes for version metadata and update support.

**Step 4: Run final verification**

Run: `cargo test --manifest-path src-tauri/Cargo.toml && npm run build`

Expected: PASS
