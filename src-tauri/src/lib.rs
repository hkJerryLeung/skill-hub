mod scanner;

use scanner::{AgentTarget, SkillInfo};

#[tauri::command]
fn scan_skills() -> Vec<SkillInfo> {
    scanner::scan_all_skills()
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
fn install_skill(source_path: String, target_agent: String, use_symlink: bool) -> Result<String, String> {
    scanner::install_skill(&source_path, &target_agent, use_symlink)
}

#[tauri::command]
fn uninstall_skill(skill_path: String) -> Result<String, String> {
    scanner::uninstall_skill(&skill_path)
}

#[tauri::command]
fn batch_migrate_skills(skills: Vec<SkillInfo>, target_agent: String) -> Result<String, String> {
    scanner::batch_migrate_skills(skills, &target_agent)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            scan_skills,
            read_skill_content,
            list_skill_files,
            get_agent_targets,
            install_skill,
            uninstall_skill,
            batch_migrate_skills
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
