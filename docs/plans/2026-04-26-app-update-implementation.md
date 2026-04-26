# App Update Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a Settings app update flow backed by Tauri's official updater plugin and public GitHub Releases.

**Architecture:** Use Tauri's updater plugin for signed update checks, downloads, and installation. Keep frontend state in `App.tsx`, display controls in `SettingsView`, and isolate label/disabled-state rules in a tested presentation helper.

**Tech Stack:** Tauri 2, React 19, TypeScript, Vite, Rust, Node assert-based tests

---

### Task 1: Add updater presentation tests

**Files:**
- Create: `src/lib/appUpdatePresentation.ts`
- Create: `tests/appUpdatePresentation.test.mjs`

**Steps:**
- Write tests for idle, checking, downloading, ready, installing, up-to-date, and error labels.
- Run `node tests/appUpdatePresentation.test.mjs` and verify it fails because the helper does not exist yet.
- Implement the helper.
- Run `node tests/appUpdatePresentation.test.mjs` and verify it passes.

### Task 2: Add Tauri updater dependencies and configuration

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `src-tauri/Cargo.toml`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/tauri.conf.json`
- Modify: `src-tauri/capabilities/default.json`

**Steps:**
- Install `@tauri-apps/plugin-updater` and `@tauri-apps/plugin-process`.
- Add Rust dependencies for `tauri-plugin-updater` and `tauri-plugin-process`.
- Initialize both plugins in the Tauri builder.
- Configure the public GitHub Releases `latest.json` endpoint.
- Enable updater artifact generation.

### Task 3: Wire Settings update UI

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/SettingsView/SettingsView.tsx`
- Modify: `src/components/SettingsView/SettingsView.css`
- Modify: `src/components/Icons/Icons.tsx`

**Steps:**
- Import updater/process APIs in `App.tsx`.
- Add app update state, check, install, and progress handlers.
- Pass update props into `SettingsView`.
- Render the `App Update` card with current version, progress, status text, and primary action.
- Add any missing local SVG icon from `Icons.tsx`.

### Task 4: Verify and package

**Commands:**
- `node tests/appUpdatePresentation.test.mjs`
- `npm run build`
- `cargo test --manifest-path src-tauri/Cargo.toml`
- `npm run tauri build`

**Notes:**
- Packaging may require signing environment variables because updater artifacts are enabled.
- If signing variables are missing, generate or configure keys before rerunning the package command.

