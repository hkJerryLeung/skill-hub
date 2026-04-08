import "./SettingsView.css";

import type {
  AgentTarget,
  AppInfo,
  AppSettings,
} from "../../lib/appSettings";
import { FolderOpenIcon, RefreshIcon, TrashIcon } from "../Icons/Icons";

const STARTUP_VIEW_OPTIONS: AppSettings["startup_view"][] = [
  "all",
  "Shared Library",
  "Claude Code",
  "Antigravity",
  "Codex",
];

const STATUS_FILTER_OPTIONS: AppSettings["startup_status_filter"][] = [
  "all",
  "symlinked",
  "local",
  "updates",
];

const THEME_OPTIONS: AppSettings["theme_mode"][] = ["system", "dark", "light"];

interface SettingsViewProps {
  draftSettings: AppSettings;
  targets: AgentTarget[];
  appInfo: AppInfo | null;
  saving: boolean;
  dirty: boolean;
  error: string | null;
  onSettingsChange: <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K],
  ) => void;
  onBrowseSharedLibrary: () => void;
  onSave: () => void;
  onCancel: () => void;
  onLoadDefaults: () => void;
  onRescan: () => void;
  onClearUpdateCache: () => void;
  onRevealPath: (path: string) => void;
}

const formatLabel = (value: string) =>
  value === "all"
    ? "All Skills"
    : value === "symlinked"
      ? "Symlinked"
      : value === "local"
        ? "Local"
        : value === "updates"
          ? "Updates Available"
          : value === "system"
            ? "System"
            : value.charAt(0).toUpperCase() + value.slice(1);

export function SettingsView({
  draftSettings,
  targets,
  appInfo,
  saving,
  dirty,
  error,
  onSettingsChange,
  onBrowseSharedLibrary,
  onSave,
  onCancel,
  onLoadDefaults,
  onRescan,
  onClearUpdateCache,
  onRevealPath,
}: SettingsViewProps) {
  const sharedLibraryStatusFilterDisabled =
    draftSettings.startup_view === "Shared Library";

  return (
    <div className="settings-view">
      <div className="settings-header">
        <div>
          <div className="settings-eyebrow">Application Preferences</div>
          <h1>Settings</h1>
          <p>
            Manage app-wide behavior, startup defaults, local cache, and the
            Shared Library folder location.
          </p>
        </div>
        <div className={`settings-dirty-pill ${dirty ? "dirty" : ""}`}>
          {dirty ? "Unsaved Changes" : "Saved"}
        </div>
      </div>

      <div className="settings-grid">
        <section className="settings-card">
          <div className="settings-card-header">
            <div>
              <h2>Library & Paths</h2>
              <p>
                Shared Library changes take effect after Save. Matching agent
                skills are relinked to the shared folder, and conflicting local
                copies are backed up automatically.
              </p>
            </div>
          </div>

          <label className="settings-field">
            <span>Shared Library Folder</span>
            <div className="settings-path-row">
              <input
                type="text"
                value={draftSettings.shared_library_path}
                onChange={(event) =>
                  onSettingsChange("shared_library_path", event.target.value)
                }
                placeholder="/absolute/path/to/SharedSkills"
              />
              <button
                type="button"
                className="settings-secondary-btn"
                onClick={onBrowseSharedLibrary}
              >
                Browse
              </button>
            </div>
          </label>

          <div className="settings-subsection">
            <div className="settings-subsection-title">Auto Categorization</div>

            <label className="settings-toggle">
              <input
                type="checkbox"
                checked={draftSettings.categorization_enabled}
                onChange={(event) =>
                  onSettingsChange("categorization_enabled", event.target.checked)
                }
              />
              <div>
                <div className="settings-toggle-title">
                  Enable semantic categorization
                </div>
                <div className="settings-toggle-help">
                  Uses an OpenAI-compatible chat completion endpoint to assign a
                  single Shared Library category when skills are imported or
                  manually auto-categorized.
                </div>
              </div>
            </label>

            <label className="settings-field">
              <span>Provider Base URL</span>
              <input
                type="text"
                value={draftSettings.categorization_base_url}
                onChange={(event) =>
                  onSettingsChange("categorization_base_url", event.target.value)
                }
                placeholder="https://api.openai.com/v1"
              />
            </label>

            <label className="settings-field">
              <span>Model</span>
              <input
                type="text"
                value={draftSettings.categorization_model}
                onChange={(event) =>
                  onSettingsChange("categorization_model", event.target.value)
                }
                placeholder="gpt-4.1-mini"
              />
            </label>

            <label className="settings-field">
              <span>API Key</span>
              <input
                type="password"
                value={draftSettings.categorization_api_key}
                onChange={(event) =>
                  onSettingsChange("categorization_api_key", event.target.value)
                }
                placeholder="sk-..."
              />
            </label>

            <label className="settings-field">
              <span>Confidence Threshold</span>
              <input
                type="number"
                min="0"
                max="1"
                step="0.05"
                value={draftSettings.categorization_confidence_threshold}
                onChange={(event) =>
                  onSettingsChange(
                    "categorization_confidence_threshold",
                    Number(event.target.value),
                  )
                }
              />
            </label>
          </div>

          <div className="settings-subsection">
            <div className="settings-subsection-title">Known Agent Folders</div>
            <div className="settings-target-list">
              {targets.map((target) => (
                <div key={target.name} className="settings-target-row">
                  <div>
                    <div className="settings-target-name">{target.name}</div>
                    <div className="settings-target-path">{target.path}</div>
                  </div>
                  <div className="settings-target-actions">
                    <span
                      className={`settings-target-badge ${
                        target.exists ? "ready" : "missing"
                      }`}
                    >
                      {target.exists ? "Detected" : "Missing"}
                    </span>
                    <button
                      type="button"
                      className="settings-icon-btn"
                      onClick={() => onRevealPath(target.path)}
                      title="Reveal in Finder"
                    >
                      <FolderOpenIcon size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="settings-card">
          <div className="settings-card-header">
            <div>
              <h2>Updates</h2>
              <p>Control launch-time update behavior and clear cached results.</p>
            </div>
          </div>

          <label className="settings-toggle">
            <input
              type="checkbox"
              checked={draftSettings.auto_check_updates_on_launch}
              onChange={(event) =>
                onSettingsChange(
                  "auto_check_updates_on_launch",
                  event.target.checked,
                )
              }
            />
            <div>
              <div className="settings-toggle-title">
                Auto-check updates on launch
              </div>
              <div className="settings-toggle-help">
                Runs the same update scan as the main toolbar automatically when
                the app opens.
              </div>
            </div>
          </label>

          <div className="settings-action-row">
            <button
              type="button"
              className="settings-secondary-btn"
              onClick={onClearUpdateCache}
            >
              <TrashIcon size={14} />
              Clear Update Cache
            </button>
          </div>
        </section>

        <section className="settings-card">
          <div className="settings-card-header">
            <div>
              <h2>Appearance & Startup</h2>
              <p>
                These preferences control how the app looks and where browsing
                starts on launch.
              </p>
            </div>
          </div>

          <label className="settings-field">
            <span>Theme</span>
            <select
              value={draftSettings.theme_mode}
              onChange={(event) =>
                onSettingsChange(
                  "theme_mode",
                  event.target.value as AppSettings["theme_mode"],
                )
              }
            >
              {THEME_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {formatLabel(value)}
                </option>
              ))}
            </select>
          </label>

          <label className="settings-field">
            <span>Startup View</span>
            <select
              value={draftSettings.startup_view}
              onChange={(event) =>
                onSettingsChange(
                  "startup_view",
                  event.target.value as AppSettings["startup_view"],
                )
              }
            >
              {STARTUP_VIEW_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {formatLabel(value)}
                </option>
              ))}
            </select>
          </label>

          <label className="settings-field">
            <span>Startup Status Filter</span>
            <select
              value={
                sharedLibraryStatusFilterDisabled &&
                (draftSettings.startup_status_filter === "local" ||
                  draftSettings.startup_status_filter === "symlinked")
                  ? "all"
                  : draftSettings.startup_status_filter
              }
              onChange={(event) =>
                onSettingsChange(
                  "startup_status_filter",
                  event.target.value as AppSettings["startup_status_filter"],
                )
              }
              disabled={sharedLibraryStatusFilterDisabled}
            >
              {STATUS_FILTER_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {formatLabel(value)}
                </option>
              ))}
            </select>
            {sharedLibraryStatusFilterDisabled && (
              <small>
                Shared Library does not support `Symlinked` or `Local` startup
                filters.
              </small>
            )}
          </label>

          <label className="settings-toggle">
            <input
              type="checkbox"
              checked={draftSettings.reduce_motion}
              onChange={(event) =>
                onSettingsChange("reduce_motion", event.target.checked)
              }
            />
            <div>
              <div className="settings-toggle-title">Reduce motion</div>
              <div className="settings-toggle-help">
                Turns off most transitions and animation-heavy affordances after
                Save.
              </div>
            </div>
          </label>
        </section>

        <section className="settings-card">
          <div className="settings-card-header">
            <div>
              <h2>Window & Behavior</h2>
              <p>Choose how cautious and stateful the app should be.</p>
            </div>
          </div>

          <label className="settings-toggle">
            <input
              type="checkbox"
              checked={draftSettings.restore_last_session}
              onChange={(event) =>
                onSettingsChange("restore_last_session", event.target.checked)
              }
            />
            <div>
              <div className="settings-toggle-title">
                Restore last browsing session on launch
              </div>
              <div className="settings-toggle-help">
                Reopens the last filter, search term, and status view instead of
                startup defaults.
              </div>
            </div>
          </label>

          <label className="settings-toggle">
            <input
              type="checkbox"
              checked={draftSettings.confirm_before_uninstall}
              onChange={(event) =>
                onSettingsChange(
                  "confirm_before_uninstall",
                  event.target.checked,
                )
              }
            />
            <div>
              <div className="settings-toggle-title">
                Confirm before uninstall
              </div>
              <div className="settings-toggle-help">
                Requires confirmation before removing a skill or shared source.
              </div>
            </div>
          </label>

          <label className="settings-toggle">
            <input
              type="checkbox"
              checked={draftSettings.confirm_before_batch_migrate}
              onChange={(event) =>
                onSettingsChange(
                  "confirm_before_batch_migrate",
                  event.target.checked,
                )
              }
            />
            <div>
              <div className="settings-toggle-title">
                Confirm before batch migration
              </div>
              <div className="settings-toggle-help">
                Shows a confirmation prompt before drag-drop or batch moves.
              </div>
            </div>
          </label>

          <label className="settings-toggle">
            <input
              type="checkbox"
              checked={draftSettings.show_drag_debug_overlay}
              onChange={(event) =>
                onSettingsChange(
                  "show_drag_debug_overlay",
                  event.target.checked,
                )
              }
            />
            <div>
              <div className="settings-toggle-title">
                Show drag debug overlay
              </div>
              <div className="settings-toggle-help">
                Displays the live drag target diagnostic box during drag
                operations.
              </div>
            </div>
          </label>
        </section>

        <section className="settings-card">
          <div className="settings-card-header">
            <div>
              <h2>Data & Cache</h2>
              <p>Maintenance actions that act on the current local app state.</p>
            </div>
          </div>

          <div className="settings-action-list">
            <button
              type="button"
              className="settings-secondary-btn"
              onClick={onRescan}
            >
              <RefreshIcon size={14} />
              Rescan Skills
            </button>
            <button
              type="button"
              className="settings-secondary-btn"
              onClick={onLoadDefaults}
            >
              Load Defaults Into Form
            </button>
          </div>
        </section>

        <section className="settings-card settings-card-wide">
          <div className="settings-card-header">
            <div>
              <h2>About</h2>
              <p>Reference paths for support, debugging, and backups.</p>
            </div>
          </div>

          <div className="settings-about-grid">
            <div className="settings-about-item">
              <div className="settings-about-label">Product</div>
              <div className="settings-about-value">
                {appInfo?.product_name ?? "Skill Hub"}
              </div>
            </div>
            <div className="settings-about-item">
              <div className="settings-about-label">Version</div>
              <div className="settings-about-value">
                {appInfo?.version ?? "0.1.0"}
              </div>
            </div>
            {[
              ["Settings File", appInfo?.settings_path],
              ["Session File", appInfo?.session_path],
              ["Update Cache", appInfo?.update_cache_path],
              ["Backups", appInfo?.backups_path],
            ].map(([label, value]) => (
              <div key={label} className="settings-about-item settings-about-path">
                <div className="settings-about-label">{label}</div>
                <div className="settings-about-value">{value ?? "Unavailable"}</div>
                {value && (
                  <button
                    type="button"
                    className="settings-icon-btn"
                    onClick={() => onRevealPath(value)}
                    title={`Reveal ${label}`}
                  >
                    <FolderOpenIcon size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="settings-footer">
        <div className="settings-footer-status">{error ?? " "}</div>
        <div className="settings-footer-actions">
          <button
            type="button"
            className="settings-secondary-btn"
            onClick={onCancel}
            disabled={!dirty || saving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="settings-primary-btn"
            onClick={onSave}
            disabled={!dirty || saving}
          >
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}
