# AI Skill Scout Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a local-model Discover assistant that recommends GitHub skills and installs confirmed choices to Shared Library.

**Architecture:** Add a Tauri `local_scout` module for provider detection, chat, and response parsing. Extend the existing Discover sidebar and `MarketView` with an AI Skill Scout branch, keeping install execution on the existing GitHub installer command.

**Tech Stack:** React 19, TypeScript, Tauri 2, Rust, reqwest blocking client, Node test runner, Cargo test.

---

### Task 1: Tests First

**Files:**
- Create: `tests/aiSkillScoutMarkup.test.mjs`
- Modify: `src-tauri/src/local_scout.rs`

**Steps:**
1. Add a Node source test that expects `AI Skill Scout` to be the first Discover item and expects `MarketView` to render provider/model/chat controls.
2. Add Rust parser tests for JSON model recommendations in `local_scout.rs`.
3. Run the tests and confirm they fail because the feature is not implemented.

### Task 2: Backend

**Files:**
- Create: `src-tauri/src/local_scout.rs`
- Modify: `src-tauri/src/lib.rs`

**Steps:**
1. Define `LocalModelProvider`, `SkillScoutRequest`, `SkillScoutResponse`, and `SkillScoutRecommendation`.
2. Detect Ollama at `http://localhost:11434` and OpenAI-compatible endpoints at `http://localhost:1234/v1`.
3. Implement provider-specific chat calls and strict JSON parsing.
4. Expose `detect_local_skill_models` and `chat_with_local_skill_scout` commands.
5. Run Cargo parser tests.

### Task 3: Frontend

**Files:**
- Modify: `src/components/Sidebar/Sidebar.tsx`
- Modify: `src/components/Icons/Icons.tsx`
- Modify: `src/components/MarketView/MarketView.tsx`
- Modify: `src/components/MarketView/MarketView.css`
- Modify: `src/App.tsx`

**Steps:**
1. Add `AI Skill Scout` as the first Discover view.
2. Add model detection state and chat state in `App.tsx`.
3. Render the AI Skill Scout view in `MarketView`.
4. Confirm before installing a recommendation and call `install_skill_from_github` with `Shared Library`.
5. Refresh skills after a successful install.

### Task 4: Verification

**Commands:**
- `node --test tests/aiSkillScoutMarkup.test.mjs`
- `cargo test --manifest-path src-tauri/Cargo.toml local_scout`
- `npm run build`
