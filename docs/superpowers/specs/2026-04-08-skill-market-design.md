# Skill Market Design

## Goal

Add a second sidebar section beneath the local agent library so Skill Hub can browse and install remote skills from `huggingface`, `skills.sh`, `skillsmp.com`, and direct GitHub links.

## Current Context

- The sidebar only supports local agent filters in `src/components/Sidebar/Sidebar.tsx`.
- The main pane only renders the local `Topbar` and `SkillGrid` flow from `src/App.tsx`.
- The Tauri backend can only install from an already-local skill folder via `install_skill`.
- `reqwest` is already available in `src-tauri/Cargo.toml` for remote fetching.

## Approved Product Decisions

- Keep the existing `Agents` block unchanged for local browsing and migration.
- Add a visible separator below `Agents`.
- Add a second sidebar block with exactly these entries:
  - `huggingface`
  - `skills.sh`
  - `skillsmp.com`
  - `Install via GitHub`
- Exclude `n-skills`.

## Proposed Behavior

### Navigation

- Clicking an agent filter keeps the existing local browser flow.
- Clicking a discover item switches the main pane into a remote discovery/install view.
- Switching away from the local browser closes the local detail drawer to avoid stale state.

### Remote Sources

#### huggingface

- Fetch and show the `huggingface/skills` catalog.
- Prefer `skills.sh/huggingface/skills` as the ranking source because it already exposes install counts for Hugging Face skills.
- Install a selected skill by resolving the matching skill name from `https://github.com/huggingface/skills`.

#### skills.sh

- Fetch the public `skills.sh` homepage and parse the embedded leaderboard payload.
- Show the hottest skills ordered by installs.
- Install a selected skill from its GitHub repository plus the expected skill name.

#### skillsmp.com

- Show this as a first-class discover page in the app.
- Explain that live API search currently requires an API key and the public site is protected by a browser challenge.
- Provide an explicit open-in-browser action instead of pretending the app can fetch live results.

#### Install via GitHub

- Provide a direct install form that accepts a GitHub repository URL or a `tree/...` skill-folder URL.
- Allow an optional skill name hint for repositories containing multiple skills.
- Install into a chosen target agent using the existing local install pipeline after downloading the source.

## Backend Data Flow

- Add a dedicated market module for remote source fetching and GitHub install helpers.
- Remote source fetching returns a normalized remote-skill shape with:
  - display name
  - repository
  - optional skill name
  - optional install count
  - source label
  - GitHub URL
- GitHub installs download a repository tarball, extract it to a temp directory, locate the requested skill folder, then reuse `install_skill`.

## Error Handling

- Surface remote fetch failures per source without breaking the local browser.
- For GitHub installs, reject unsupported URLs and ambiguous multi-skill repositories without a skill hint.
- Clean up temporary download/extract directories after each install attempt.

## Testing

- Add pure frontend tests for parsing `skills.sh` leaderboard HTML and Hugging Face repository pages.
- Add Rust unit tests for GitHub URL parsing and skill-directory resolution.
- Run focused JS tests, Rust tests, and `npm run build` before completion.

## Scope

This change intentionally does not add:

- authenticated `skillsmp.com` API integration
- inline rendering of every remote `SKILL.md` page
- drag-and-drop from remote sources into local agents
