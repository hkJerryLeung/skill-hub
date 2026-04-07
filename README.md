# Skill Hub

<p>
  <strong>A local-first desktop application for managing AI Agent skills, featuring a sleek, modular design and robust batch management capabilities.</strong>
</p>

## Overview

Skill Hub is a high-performance desktop application designed to streamline the management of AI agent skills. Built with modern web technologies, it allows you to easily categorize, drag-and-drop, and batch-migrate your skills across different AI agent environments such as Claude Code, Antigravity, and Codex. 

The user interface adheres to the custom WWT Design Guidelines, featuring a premium dark-mode aesthetic with brand-red accents and a typography-driven UI element system.

## Key Features

- **Multi-Selection & Batch Operations:** Use the built-in marquee (lasso) tool to select multiple skills at once and migrate them seamlessly.
- **Drag-and-Drop Architecture:** Intuitive UI allows moving skills between agents (Claude Code, Antigravity, Codex) and the centralized Shared Library.
- **Local-First Performance:** Powered by Tauri, ensuring your data and skills remain locally managed with native desktop performance.
- **Sleek Interface:** Designed following a strict '95/5' color rule (Dark mode with brand red highlights `#990011` / `#F5000A`).
- **Official Brand Assets:** Implements scalable, color-adapted official SVG brand icons for the specific AI agents.

## Tech Stack

- [Tauri](https://tauri.app/) - Local-First App Container
- [React 18](https://react.dev/) - Frontend UI Library
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Vite](https://vitejs.dev/) - Build tool

## Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/skill-hub.git
   cd skill-hub
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
