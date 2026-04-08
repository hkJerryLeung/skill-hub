mod categorizer;
mod market;
mod scanner;
mod settings;
mod update_manager;

use market::RemoteMarketEntry;
use scanner::{AgentTarget, SkillInfo};
use settings::{AppInfo, AppSettings, BrowserSessionState};

#[tauri::command]
fn scan_skills(app: tauri::AppHandle) -> Vec<SkillInfo> {
    if let Err(error) = scanner::normalize_legacy_agent_symlinks() {
        eprintln!("failed to normalize legacy symlinked skills: {}", error);
    }
    let mut skills = scanner::scan_all_skills();
    if let Err(error) = update_manager::hydrate_skills_from_cache(&app, &mut skills) {
        eprintln!("failed to hydrate update cache: {}", error);
    }
    skills
}

#[tauri::command]
fn read_skill_content(skill_path: String) -> Result<String, String> {
    scanner::read_skill_content(&skill_path)
}

#[tauri::command]
fn list_skill_files(skill_path: String) -> Vec<String> {
    scanner::list_skill_files(&skill_path)
}

#[tauri::command]
fn get_agent_targets() -> Vec<AgentTarget> {
    scanner::get_agent_paths()
}

#[tauri::command]
fn fetch_remote_market(source: String) -> Result<Vec<RemoteMarketEntry>, String> {
    market::fetch_remote_market(&source)
}

#[tauri::command]
fn get_app_settings() -> Result<AppSettings, String> {
    settings::load_settings()
}

#[tauri::command]
fn get_default_app_settings() -> AppSettings {
    AppSettings::default()
}

#[tauri::command]
fn save_app_settings(settings_payload: AppSettings) -> Result<AppSettings, String> {
    settings::save_settings(&settings_payload)
}

#[tauri::command]
fn reconcile_shared_library_targets() -> Result<String, String> {
    scanner::reconcile_shared_library_targets()
}

#[tauri::command]
fn get_browser_session_state() -> Result<BrowserSessionState, String> {
    settings::load_browser_session_state()
}

#[tauri::command]
fn save_browser_session_state(session: BrowserSessionState) -> Result<(), String> {
    settings::save_browser_session_state(&session)
}

#[tauri::command]
fn clear_update_cache(app: tauri::AppHandle) -> Result<String, String> {
    update_manager::clear_update_cache(&app)
}

#[tauri::command]
fn get_app_info(app: tauri::AppHandle) -> Result<AppInfo, String> {
    Ok(AppInfo {
        product_name: String::from("Skill Gate"),
        version: env!("CARGO_PKG_VERSION").to_string(),
        settings_path: settings::settings_path()?.to_string_lossy().to_string(),
        session_path: settings::session_path()?.to_string_lossy().to_string(),
        update_cache_path: update_manager::cache_path_for_app(&app)?
            .to_string_lossy()
            .to_string(),
        backups_path: update_manager::backups_root_for_app(&app)?
            .to_string_lossy()
            .to_string(),
    })
}

#[tauri::command]
fn install_skill(source_path: String, target_agent: String) -> Result<String, String> {
    scanner::install_skill(&source_path, &target_agent)
}

#[tauri::command]
fn install_skill_to_shared_category(
    source_path: String,
    category_slug: String,
) -> Result<String, String> {
    scanner::install_skill_to_shared_category(&source_path, &category_slug)
}

#[tauri::command]
fn install_skill_from_github(
    github_url: String,
    target_agent: String,
    skill_name: Option<String>,
    market_source: Option<String>,
    market_url: Option<String>,
) -> Result<String, String> {
    market::install_skill_from_github(
        &github_url,
        &target_agent,
        skill_name.as_deref(),
        market_source.as_deref(),
        market_url.as_deref(),
    )
}

#[tauri::command]
fn uninstall_skill(skill_path: String) -> Result<String, String> {
    scanner::uninstall_skill(&skill_path)
}

#[tauri::command]
fn batch_migrate_skills(skills: Vec<SkillInfo>, target_agent: String) -> Result<String, String> {
    scanner::batch_migrate_skills(skills, &target_agent)
}

#[tauri::command]
fn move_shared_skill_to_category(
    skill_path: String,
    category_slug: String,
) -> Result<String, String> {
    scanner::move_shared_skill_to_category(&skill_path, &category_slug)
}

#[tauri::command]
fn auto_categorize_shared_skills(skill_paths: Vec<String>) -> Result<String, String> {
    scanner::auto_categorize_shared_skills(skill_paths)
}

#[tauri::command]
fn check_skill_updates(app: tauri::AppHandle, skill_path: String) -> Result<String, String> {
    update_manager::check_skill_updates(&app, &skill_path)
}

#[tauri::command]
fn check_all_skill_updates(app: tauri::AppHandle) -> Result<String, String> {
    update_manager::check_all_skill_updates(&app)
}

#[tauri::command]
fn update_skill(app: tauri::AppHandle, skill_path: String) -> Result<String, String> {
    update_manager::update_single_skill(&app, &skill_path)
}

#[tauri::command]
fn update_all_skills(app: tauri::AppHandle) -> Result<String, String> {
    update_manager::update_all_github_skills(&app)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            scan_skills,
            read_skill_content,
            list_skill_files,
            get_agent_targets,
            fetch_remote_market,
            get_app_settings,
            get_default_app_settings,
            save_app_settings,
            reconcile_shared_library_targets,
            get_browser_session_state,
            save_browser_session_state,
            clear_update_cache,
            get_app_info,
            install_skill,
            install_skill_to_shared_category,
            install_skill_from_github,
            uninstall_skill,
            batch_migrate_skills,
            move_shared_skill_to_category,
            auto_categorize_shared_skills,
            check_skill_updates,
            check_all_skill_updates,
            update_skill,
            update_all_skills
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
