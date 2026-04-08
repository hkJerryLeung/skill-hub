# Settings Page Design

## Goal

Add a first-class app settings experience to Skill Hub, exposed from the lower-left sidebar, with a complete desktop-style settings page and persistent configuration. The most important requirement is making the Shared Library folder configurable instead of fixed to `~/SharedSkills`.

## Current Context

- The app currently has a single browse flow in `src/App.tsx` with a fixed left sidebar and no view-level routing.
- Shared Library path resolution is hard-coded in `src-tauri/src/scanner.rs`.
- There is no persisted app settings model yet.
- Update cache already exists in the Tauri app data directory via `src-tauri/src/update_manager.rs`.

## Approved Product Decisions

- Settings uses a dedicated main-content page, not a drawer or separate window.
- The settings entry sits at the bottom of the left sidebar.
- Settings use a form-based `Save` / `Cancel` flow.
- Changing the Shared Library folder does not move existing data automatically.

## Proposed Behavior

### Navigation

- Add a `Settings` item pinned to the sidebar footer.
- Clicking `Settings` switches the main pane from the skill browser to a settings page.
- Clicking any agent filter exits settings and returns to browsing.

### Persisted Settings

Persist these settings in a JSON file:

- `shared_library_path`
- `theme_mode`
- `reduce_motion`
- `auto_check_updates_on_launch`
- `startup_view`
- `startup_status_filter`
- `restore_last_session`
- `confirm_before_uninstall`
- `confirm_before_batch_migrate`
- `show_drag_debug_overlay`

### Settings Sections

#### Library & Paths

- Editable Shared Library folder path
- Folder picker button
- Read-only display of all known agent target folders

#### Updates

- Auto-check for updates on launch
- Clear cached update status action

#### Appearance & Startup

- Theme: `System`, `Dark`, `Light`
- Reduced motion
- Startup view
- Startup status filter

#### Window & Behavior

- Restore last browsing session on launch
- Confirm before uninstall
- Confirm before batch migration
- Show drag debug overlay

#### Data & Cache

- Rescan skills now
- Load default settings into the form
- Clear update cache

#### About

- Product name and version
- Settings file path
- Update cache path
- Backup directory path

## Data Flow

### Backend

- Introduce a dedicated settings module in Tauri for load/save/default/session-state logic.
- Replace hard-coded Shared Library path resolution with a settings-backed value.
- Expose commands to get/save settings, get defaults, read/save browsing session state, fetch app info, and clear update cache.

### Frontend

- Load skills, agent targets, settings, session state, and app info during app bootstrap.
- Resolve initial browse state from either the saved session or the configured startup defaults.
- Keep saved settings and a mutable draft copy so `Save` / `Cancel` works cleanly.
- Apply theme and reduced-motion settings only after successful save.

## Error Handling

- Reject empty Shared Library paths on save.
- Accept non-existent absolute paths without creating or moving anything immediately.
- If the user switches Shared Library path, rescan skills after save and close stale detail selections if needed.
- Keep data/cache actions independent so a failed cache clear does not block other settings changes.

## Testing

- Add pure frontend tests for startup/session resolution and Shared Library filter normalization.
- Add Rust unit tests for settings persistence defaults and Shared Library path normalization.
- Run the existing lightweight JS regression tests.
- Run Rust tests and the production build before claiming completion.

## Scope

This change intentionally does not add:

- automatic migration of files from the previous Shared Library location
- a second Tauri window for preferences
- per-agent editable install paths
