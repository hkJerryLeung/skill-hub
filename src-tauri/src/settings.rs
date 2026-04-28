use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

const APP_CONFIG_DIR_NAME: &str = "skill-gate";
const LEGACY_APP_CONFIG_DIR_NAME: &str = "skill-hub";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
pub struct AppInfo {
    pub product_name: String,
    pub version: String,
    pub settings_path: String,
    pub session_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
pub struct BrowserSessionState {
    #[serde(default)]
    pub filter: StartupView,
    #[serde(default)]
    pub search: String,
    #[serde(default)]
    pub status_filter: StartupStatusFilter,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
pub enum ThemeMode {
    #[serde(rename = "dark")]
    #[default]
    Dark,
    #[serde(rename = "system")]
    System,
    #[serde(rename = "light")]
    Light,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
pub enum StartupView {
    #[default]
    #[serde(rename = "all")]
    All,
    #[serde(rename = "Shared Library")]
    SharedLibrary,
    #[serde(rename = "Claude Code")]
    ClaudeCode,
    #[serde(rename = "Antigravity")]
    Antigravity,
    #[serde(rename = "Codex")]
    Codex,
    #[serde(rename = "Cursor")]
    Cursor,
    #[serde(rename = "Bin")]
    Bin,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
pub enum StartupStatusFilter {
    #[default]
    #[serde(rename = "all")]
    All,
    #[serde(rename = "symlinked")]
    Symlinked,
    #[serde(rename = "local")]
    Local,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(default)]
pub struct AppSettings {
    pub shared_library_path: String,
    pub bin_path: String,
    pub theme_mode: ThemeMode,
    pub reduce_motion: bool,
    pub categorization_enabled: bool,
    pub categorization_base_url: String,
    pub categorization_model: String,
    pub categorization_api_key: String,
    pub categorization_confidence_threshold: f64,
    pub startup_view: StartupView,
    pub startup_status_filter: StartupStatusFilter,
    pub restore_last_session: bool,
    pub confirm_before_uninstall: bool,
    pub confirm_before_batch_migrate: bool,
    pub show_drag_debug_overlay: bool,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            shared_library_path: default_shared_library_path(),
            bin_path: default_bin_path(),
            theme_mode: ThemeMode::Dark,
            reduce_motion: false,
            categorization_enabled: false,
            categorization_base_url: String::new(),
            categorization_model: String::new(),
            categorization_api_key: String::new(),
            categorization_confidence_threshold: 0.7,
            startup_view: StartupView::All,
            startup_status_filter: StartupStatusFilter::All,
            restore_last_session: true,
            confirm_before_uninstall: true,
            confirm_before_batch_migrate: true,
            show_drag_debug_overlay: false,
        }
    }
}

fn default_shared_library_path() -> String {
    dirs::home_dir()
        .unwrap_or_else(|| PathBuf::from("~"))
        .join("SharedSkills")
        .to_string_lossy()
        .to_string()
}

pub(crate) fn default_bin_path() -> String {
    config_root()
        .unwrap_or_else(|_| {
            dirs::home_dir()
                .unwrap_or_else(|| PathBuf::from("~"))
                .join(".skill-gate")
        })
        .join("bin")
        .to_string_lossy()
        .to_string()
}

pub(crate) fn config_root() -> Result<PathBuf, String> {
    let base =
        dirs::config_dir().ok_or_else(|| String::from("Failed to resolve config directory"))?;
    let current = base.join(APP_CONFIG_DIR_NAME);
    let legacy = base.join(LEGACY_APP_CONFIG_DIR_NAME);

    if current.exists() || !legacy.exists() {
        Ok(current)
    } else {
        Ok(legacy)
    }
}

fn ensure_parent_dir(path: &Path) -> Result<(), String> {
    let Some(parent) = path.parent() else {
        return Ok(());
    };

    fs::create_dir_all(parent).map_err(|error| {
        format!(
            "Failed to create config directory '{}': {}",
            parent.display(),
            error
        )
    })
}

fn expand_home_prefix(value: &str) -> Result<PathBuf, String> {
    if value == "~" {
        return dirs::home_dir().ok_or_else(|| String::from("Failed to resolve home directory"));
    }

    if let Some(rest) = value.strip_prefix("~/") {
        let home =
            dirs::home_dir().ok_or_else(|| String::from("Failed to resolve home directory"))?;
        return Ok(home.join(rest));
    }

    Ok(PathBuf::from(value))
}

fn normalize_absolute_folder_path(raw: &str, label: &str) -> Result<String, String> {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return Err(format!("{} folder cannot be empty", label));
    }

    let expanded = expand_home_prefix(trimmed)?;
    if !expanded.is_absolute() {
        return Err(format!("{} folder must be an absolute path", label));
    }

    Ok(expanded.to_string_lossy().to_string())
}

pub(crate) fn normalize_shared_library_path(raw: &str) -> Result<String, String> {
    normalize_absolute_folder_path(raw, "Shared Library")
}

pub(crate) fn normalize_bin_path(raw: &str) -> Result<String, String> {
    normalize_absolute_folder_path(raw, "Bin")
}

pub(crate) fn settings_path() -> Result<PathBuf, String> {
    Ok(config_root()?.join("settings.json"))
}

pub(crate) fn session_path() -> Result<PathBuf, String> {
    Ok(config_root()?.join("session.json"))
}

pub(crate) fn load_settings_from_path(path: &Path) -> Result<AppSettings, String> {
    if !path.exists() {
        return Ok(AppSettings::default());
    }

    let content = fs::read_to_string(path)
        .map_err(|error| format!("Failed to read settings '{}': {}", path.display(), error))?;

    let mut settings: AppSettings = serde_json::from_str(&content)
        .map_err(|error| format!("Failed to parse settings '{}': {}", path.display(), error))?;

    settings.shared_library_path = normalize_shared_library_path(&settings.shared_library_path)
        .unwrap_or_else(|_| default_shared_library_path());
    settings.bin_path =
        normalize_bin_path(&settings.bin_path).unwrap_or_else(|_| default_bin_path());

    Ok(settings)
}

pub(crate) fn load_settings() -> Result<AppSettings, String> {
    load_settings_from_path(&settings_path()?)
}

pub(crate) fn save_settings_to_path(
    path: &Path,
    settings: &AppSettings,
) -> Result<AppSettings, String> {
    let mut normalized = settings.clone();
    normalized.shared_library_path =
        normalize_shared_library_path(&normalized.shared_library_path)?;
    normalized.bin_path = normalize_bin_path(&normalized.bin_path)?;

    ensure_parent_dir(path)?;
    let content = serde_json::to_string_pretty(&normalized)
        .map_err(|error| format!("Failed to serialize settings: {}", error))?;

    fs::write(path, content)
        .map_err(|error| format!("Failed to write settings '{}': {}", path.display(), error))?;

    Ok(normalized)
}

pub(crate) fn save_settings(settings: &AppSettings) -> Result<AppSettings, String> {
    save_settings_to_path(&settings_path()?, settings)
}

pub(crate) fn load_browser_session_state_from_path(
    path: &Path,
) -> Result<BrowserSessionState, String> {
    if !path.exists() {
        return Ok(BrowserSessionState::default());
    }

    let content = fs::read_to_string(path).map_err(|error| {
        format!(
            "Failed to read session state '{}': {}",
            path.display(),
            error
        )
    })?;

    serde_json::from_str(&content).map_err(|error| {
        format!(
            "Failed to parse session state '{}': {}",
            path.display(),
            error
        )
    })
}

pub(crate) fn load_browser_session_state() -> Result<BrowserSessionState, String> {
    load_browser_session_state_from_path(&session_path()?)
}

pub(crate) fn save_browser_session_state_to_path(
    path: &Path,
    state: &BrowserSessionState,
) -> Result<(), String> {
    ensure_parent_dir(path)?;
    let content = serde_json::to_string_pretty(state)
        .map_err(|error| format!("Failed to serialize session state: {}", error))?;

    fs::write(path, content).map_err(|error| {
        format!(
            "Failed to write session state '{}': {}",
            path.display(),
            error
        )
    })
}

pub(crate) fn save_browser_session_state(state: &BrowserSessionState) -> Result<(), String> {
    save_browser_session_state_to_path(&session_path()?, state)
}

#[cfg(test)]
mod tests {
    use super::{
        load_settings_from_path, normalize_bin_path, normalize_shared_library_path,
        save_settings_to_path, AppSettings, ThemeMode,
    };
    use std::fs;
    use std::path::Path;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn temp_dir(label: &str) -> std::path::PathBuf {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let dir = std::env::temp_dir().join(format!("skill-gate-settings-{}-{}", label, unique));
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn missing_settings_file_returns_defaults() {
        let temp_path = temp_dir("missing").join("settings.json");
        let loaded = load_settings_from_path(&temp_path).unwrap();
        assert_eq!(loaded, AppSettings::default());
    }

    #[test]
    fn default_settings_use_dark_theme() {
        assert_eq!(AppSettings::default().theme_mode, ThemeMode::Dark);
    }

    #[test]
    fn home_prefixed_shared_library_path_is_expanded_and_trimmed() {
        let normalized = normalize_shared_library_path("  ~/SharedSkills  ").unwrap();
        assert!(
            Path::new(&normalized).is_absolute(),
            "shared library path should be absolute after normalization"
        );
        assert!(
            normalized.ends_with("SharedSkills"),
            "normalized path should keep the requested folder name"
        );
    }

    #[test]
    fn home_prefixed_bin_path_is_expanded_and_trimmed() {
        let normalized = normalize_bin_path("  ~/SkillBin  ").unwrap();
        assert!(
            Path::new(&normalized).is_absolute(),
            "Bin path should be absolute after normalization"
        );
        assert!(
            normalized.ends_with("SkillBin"),
            "normalized path should keep the requested Bin folder name"
        );
    }

    #[test]
    fn save_settings_normalizes_the_shared_library_path() {
        let path = temp_dir("save").join("settings.json");
        let settings = AppSettings {
            shared_library_path: String::from("~/SharedSkills"),
            ..AppSettings::default()
        };

        let saved = save_settings_to_path(&path, &settings).unwrap();
        assert!(Path::new(&saved.shared_library_path).is_absolute());
        assert!(path.exists(), "settings file should be written");
    }

    #[test]
    fn save_settings_normalizes_the_bin_path() {
        let path = temp_dir("save-bin").join("settings.json");
        let settings = AppSettings {
            bin_path: String::from("~/SkillBin"),
            ..AppSettings::default()
        };

        let saved = save_settings_to_path(&path, &settings).unwrap();
        assert!(Path::new(&saved.bin_path).is_absolute());
        assert!(
            saved.bin_path.ends_with("SkillBin"),
            "custom Bin folder should be persisted after normalization"
        );
    }

    #[test]
    fn load_settings_falls_back_when_bin_path_is_invalid() {
        let path = temp_dir("load-bin").join("settings.json");
        let settings = AppSettings {
            bin_path: String::from("/tmp/SkillBin"),
            ..AppSettings::default()
        };
        let mut content = serde_json::to_value(settings).unwrap();
        content["bin_path"] = serde_json::Value::String(String::from("relative-bin"));
        fs::write(&path, serde_json::to_string_pretty(&content).unwrap()).unwrap();

        let loaded = load_settings_from_path(&path).unwrap();

        assert_eq!(loaded.bin_path, AppSettings::default().bin_path);
    }
}
