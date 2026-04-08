# Skill Market Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a second sidebar discovery section and working remote-skill installation flows for `huggingface`, `skills.sh`, `skillsmp.com`, and direct GitHub links.

**Architecture:** Keep local browsing intact and introduce a separate remote-market view in the main pane. Add a small Tauri market module for remote scraping and GitHub tarball installs, while `App.tsx` owns source selection, fetch state, and install actions.

**Tech Stack:** Tauri 2, Rust, React 19, TypeScript, Vite, Node assert-based tests

---

### Task 1: Add failing parser tests for remote sources

**Files:**
- Create: `tests/marketData.test.mjs`
- Create: `src/lib/remoteMarketData.ts`

- [ ] **Step 1: Write failing tests for `skills.sh` leaderboard parsing and Hugging Face page parsing**
- [ ] **Step 2: Run `node tests/marketData.test.mjs` and verify it fails**
- [ ] **Step 3: Implement minimal parsing helpers**
- [ ] **Step 4: Run `node tests/marketData.test.mjs` and verify it passes**

### Task 2: Add failing Rust tests for GitHub install resolution

**Files:**
- Create: `src-tauri/src/market.rs`

- [ ] **Step 1: Add failing tests for GitHub URL parsing and skill directory resolution**
- [ ] **Step 2: Run `cargo test market` and verify it fails**
- [ ] **Step 3: Implement tarball download, extraction, and folder resolution helpers**
- [ ] **Step 4: Run `cargo test market` and verify it passes**

### Task 3: Expose market commands from Tauri

**Files:**
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/src/scanner.rs`
- Modify: `src-tauri/Cargo.toml`

- [ ] **Step 1: Add commands to fetch remote market data and install from GitHub**
- [ ] **Step 2: Reuse `install_skill` for the final copy/link step**
- [ ] **Step 3: Keep temp-directory cleanup and useful error messages**

### Task 4: Build the sidebar discover section and remote main-pane views

**Files:**
- Modify: `src/components/Sidebar/Sidebar.tsx`
- Modify: `src/components/Sidebar/Sidebar.css`
- Modify: `src/components/Icons/Icons.tsx`
- Modify: `src/App.tsx`
- Create: `src/components/MarketView/MarketView.tsx`
- Create: `src/components/MarketView/MarketView.css`
- Create: `src/lib/marketTypes.ts`

- [ ] **Step 1: Add the separated `Discover` block with the four requested items**
- [ ] **Step 2: Switch the main pane between local browsing and remote views**
- [ ] **Step 3: Add source-specific loading, retry, and install actions**
- [ ] **Step 4: Add the direct GitHub install form with target-agent selection**

### Task 5: Verify the integrated flow

**Files:**
- Verify: `tests/marketData.test.mjs`
- Verify: `src-tauri/src/market.rs`
- Verify: `src/App.tsx`
- Verify: `src/components/MarketView/MarketView.tsx`

- [ ] **Step 1: Run focused frontend tests**
- [ ] **Step 2: Run Rust tests**
- [ ] **Step 3: Run the lightweight JS regression suite**
- [ ] **Step 4: Run `npm run build`**
