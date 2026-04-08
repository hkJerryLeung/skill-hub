# Skill Gate

<p>
  <strong>A local-first desktop application for managing AI Agent skills, featuring a sleek, modular design and robust batch management capabilities.</strong>
</p>

## Overview

Skill Gate is a high-performance desktop application designed to streamline the management of AI agent skills. Built with modern web technologies, it allows you to easily categorize, drag-and-drop, and batch-migrate your skills across different AI agent environments such as Claude Code, Antigravity, and Codex. 

The user interface adheres to the custom WWT Design Guidelines, featuring a premium dark-mode aesthetic with brand-red accents and a typography-driven UI element system.

## Key Features

- **Multi-Selection & Batch Operations:** Use the built-in marquee (lasso) tool to select multiple skills at once and migrate them seamlessly.
- **Drag-and-Drop Architecture:** Intuitive UI allows moving skills between agents (Claude Code, Antigravity, Codex) and the centralized Shared Library.
- **Version Visibility:** Reads `version:` and `source:` from `SKILL.md` frontmatter and surfaces version state directly in the grid and detail panel.
- **Update Prompts:** Checks GitHub-backed skills for remote updates, shows upstream versions, and flags skills that require manual updates.
- **One-Click Bulk Updates:** Runs sequential GitHub skill updates with pre-update backups while preserving local-only extra files.
- **Local-First Performance:** Powered by Tauri, ensuring your data and skills remain locally managed with native desktop performance.
- **Sleek Interface:** Designed following a strict '95/5' color rule (Dark mode with brand red highlights `#990011` / `#F5000A`).
- **Official Brand Assets:** Implements scalable, color-adapted official SVG brand icons for the specific AI agents.

## Versioning And Update Sources

- `version:` is read from `SKILL.md` and shown as the local installed version.
- `source:` determines update behavior.
- GitHub sources support update checks, single-skill updates, and bulk updates.
- Non-GitHub URLs support best-effort version hints only and remain manual-update sources.
- Values such as `community`, `self`, `personal`, or missing `source:` are treated as manual-only.

Before any automatic update, Skill Gate backs up overwritten files to the app data directory and preserves local files that are not present upstream.

## Tech Stack

- [Tauri](https://tauri.app/) - Local-First App Container
- [React 18](https://react.dev/) - Frontend UI Library
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Vite](https://vitejs.dev/) - Build tool

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/skill-gate.git
   cd skill-gate
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run in development mode**
   ```bash
   npm run tauri dev
   ```

4. **Build for production**
   ```bash
   npm run tauri build
   ```

## License

This project is open-sourced under the [MIT License](LICENSE).
