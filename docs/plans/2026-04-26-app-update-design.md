# App Update Design

## Goal

Add a Settings-based app update flow to Skill Gate using public GitHub Releases, without depending on a private GitHub repository or a custom domain.

## Approved Product Decisions

- Use public GitHub Releases as the updater host.
- Use Tauri's official updater plugin for install, verification, and restart behavior.
- Reuse the Super Sort Settings workflow as UX reference only: current version, manual check, download progress, install/relaunch state, and clear error feedback.
- Do not port Super Sort's Electron updater implementation or its private GitHub release workflow.

## Update Source

Skill Gate will check this public release asset:

```text
https://github.com/hkJerryLeung/skill-hub/releases/latest/download/latest.json
```

Tauri's updater static JSON format supports GitHub Releases as a CDN-style host. The `latest.json` release asset must include `version`, `notes`, `pub_date`, and per-platform update artifact URLs plus the generated signature content.

## Architecture

### Tauri

- Add `tauri-plugin-updater` and initialize it in `src-tauri/src/lib.rs`.
- Configure `src-tauri/tauri.conf.json` with:
  - `bundle.createUpdaterArtifacts: true`
  - `plugins.updater.pubkey`
  - `plugins.updater.endpoints`
- Add updater permissions to `src-tauri/capabilities/default.json`.

### Frontend

- Add `@tauri-apps/plugin-updater` and `@tauri-apps/plugin-process`.
- Add a small update presentation helper for button labels, status text, and disabled states.
- Keep update runtime state in `src/App.tsx`.
- Pass update state and actions into `SettingsView`.
- Render an `App Update` Settings card with:
  - current version
  - manual check/install button
  - progress bar while downloading
  - status or error message

## Error Handling

- If no update is available, show an up-to-date state and leave the button available for another manual check.
- If check or install fails, show the error and switch the button to retry.
- If an update is downloaded, the primary action installs it and relaunches the app.

## Release Notes

The initial local build can include updater support before a real public release asset exists. A manual check will fail until `latest.json` and signed artifacts are uploaded to the public GitHub Release.

