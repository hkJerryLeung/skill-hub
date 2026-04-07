use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

/// Represents a single discovered skill
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillInfo {
    pub name: String,
    pub description: String,
    pub path: String,
    pub agent: String,
    pub is_symlink: bool,
    pub category: Option<String>,
}

/// Known agent configurations
struct AgentConfig {
    name: &'static str,
    skills_path: PathBuf,
    recursive: bool,
}

/// Get the list of known agent skill directories
fn get_agent_configs() -> Vec<AgentConfig> {
    let home = dirs::home_dir().unwrap_or_default();
    vec![
        AgentConfig {
            name: "Shared Library",
            skills_path: home.join("SharedSkills"),
            recursive: true,
        },
        AgentConfig {
            name: "Claude Code",
            skills_path: home.join(".claude").join("skills"),
            recursive: false,
        },
        AgentConfig {
            name: "Antigravity",
            skills_path: home.join(".gemini").join("antigravity").join("skills"),
            recursive: false,
        },
        AgentConfig {
            name: "Codex",
            skills_path: home
                .join(".codex")
                .join("vendor_imports")
                .join("skills")
                .join("skills")
                .join(".curated"),
            recursive: false,
        },
    ]
}

/// Parse the SKILL.md frontmatter to extract description
fn parse_skill_description(skill_dir: &Path) -> String {
    let skill_md = skill_dir.join("SKILL.md");
    if !skill_md.exists() {
        return String::from("No SKILL.md found");
    }

    let content = match fs::read_to_string(&skill_md) {
        Ok(c) => c,
        Err(_) => return String::from("Could not read SKILL.md"),
    };

    // Parse YAML frontmatter between --- markers
    if content.starts_with("---") {
        if let Some(end) = content[3..].find("---") {
            let frontmatter = &content[3..3 + end];
            for line in frontmatter.lines() {
                let line = line.trim();
                if line.starts_with("description:") {
                    return line["description:".len()..].trim().to_string();
                }
            }
        }
    }

    // Fallback: use the first non-empty line after frontmatter
    String::from("No description")
}

/// Scan a single agent's skills directory (flat)
fn scan_flat(config: &AgentConfig) -> Vec<SkillInfo> {
    let mut skills = Vec::new();
    if !config.skills_path.exists() {
        return skills;
    }
    let entries = match fs::read_dir(&config.skills_path) {
        Ok(e) => e,
        Err(_) => return skills,
    };
    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_dir() { continue; }
        let name = path.file_name().unwrap_or_default().to_string_lossy().to_string();
        let is_symlink = entry.file_type().map(|ft| ft.is_symlink()).unwrap_or(false);
        let description = parse_skill_description(&path);
        skills.push(SkillInfo {
            name, description,
            path: path.to_string_lossy().to_string(),
            agent: config.name.to_string(),
            is_symlink,
            category: None,
        });
    }
    skills.sort_by(|a, b| a.name.cmp(&b.name));
    skills
}

/// Scan recursively — supports category folders (one level deep)
/// e.g. SharedSkills/security/007/SKILL.md → category="security"
fn scan_recursive(config: &AgentConfig) -> Vec<SkillInfo> {
    let mut skills = Vec::new();
    if !config.skills_path.exists() {
        return skills;
    }
    let entries = match fs::read_dir(&config.skills_path) {
        Ok(e) => e,
        Err(_) => return skills,
    };
    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_dir() { continue; }
        let dir_name = path.file_name().unwrap_or_default().to_string_lossy().to_string();
        let is_symlink = entry.file_type().map(|ft| ft.is_symlink()).unwrap_or(false);

        // Check if this is a skill (has SKILL.md) or a category folder
        if path.join("SKILL.md").exists() {
            // Direct skill at root level (no category)
            let description = parse_skill_description(&path);
            skills.push(SkillInfo {
                name: dir_name, description,
                path: path.to_string_lossy().to_string(),
                agent: config.name.to_string(),
                is_symlink,
                category: None,
            });
        } else {
            // Treat as category folder — scan one level deeper
            let category_name = dir_name;
            if let Ok(sub_entries) = fs::read_dir(&path) {
                for sub_entry in sub_entries.flatten() {
                    let sub_path = sub_entry.path();
                    if !sub_path.is_dir() { continue; }
                    if !sub_path.join("SKILL.md").exists() { continue; }
                    let sub_name = sub_path.file_name().unwrap_or_default().to_string_lossy().to_string();
                    let sub_symlink = sub_entry.file_type().map(|ft| ft.is_symlink()).unwrap_or(false);
                    let description = parse_skill_description(&sub_path);
                    skills.push(SkillInfo {
                        name: sub_name, description,
                        path: sub_path.to_string_lossy().to_string(),
                        agent: config.name.to_string(),
                        is_symlink: sub_symlink,
                        category: Some(category_name.clone()),
                    });
                }
            }
        }
    }
    skills.sort_by(|a, b| a.name.cmp(&b.name));
    skills
}

/// Scan all known agents and return all discovered skills
pub fn scan_all_skills() -> Vec<SkillInfo> {
    let configs = get_agent_configs();
    let mut all_skills = Vec::new();
    for config in &configs {
        if config.recursive {
            all_skills.extend(scan_recursive(config));
        } else {
            all_skills.extend(scan_flat(config));
        }
    }
    all_skills
}

/// Read the full content of a skill's SKILL.md
pub fn read_skill_content(skill_path: &str) -> Result<String, String> {
    let path = Path::new(skill_path).join("SKILL.md");
    fs::read_to_string(&path).map_err(|e| format!("Failed to read SKILL.md: {}", e))
}

/// List files in a skill directory
pub fn list_skill_files(skill_path: &str) -> Vec<String> {
    let path = Path::new(skill_path);
    let mut files = Vec::new();

    if let Ok(entries) = fs::read_dir(path) {
        for entry in entries.flatten() {
            let name = entry.file_name().to_string_lossy().to_string();
            let is_dir = entry.path().is_dir();
            files.push(if is_dir {
                format!("📁 {}", name)
            } else {
                format!("📄 {}", name)
            });
        }
    }

    files.sort();
    files
}

/// Get available agent targets for installation
pub fn get_agent_paths() -> Vec<AgentTarget> {
    get_agent_configs()
        .into_iter()
        .map(|c| AgentTarget {
            name: c.name.to_string(),
            path: c.skills_path.to_string_lossy().to_string(),
            exists: c.skills_path.exists(),
        })
        .collect()
}

#[derive(Debug, Clone, Serialize)]
pub struct AgentTarget {
    pub name: String,
    pub path: String,
    pub exists: bool,
}

/// Install a skill to a target agent via symlink
pub fn install_skill(source_path: &str, target_agent: &str, use_symlink: bool) -> Result<String, String> {
    let configs = get_agent_configs();
    let target = configs
        .iter()
        .find(|c| c.name == target_agent)
        .ok_or_else(|| format!("Unknown agent: {}", target_agent))?;

    // Ensure target skills directory exists
    if !target.skills_path.exists() {
        fs::create_dir_all(&target.skills_path)
            .map_err(|e| format!("Failed to create target dir: {}", e))?;
    }

    let source = Path::new(source_path);
    let skill_name = source
        .file_name()
        .ok_or("Invalid source path")?
        .to_string_lossy()
        .to_string();

    let dest = target.skills_path.join(&skill_name);

    // Check if already exists
    if dest.exists() || dest.is_symlink() {
        return Err(format!("Skill '{}' already exists in {}", skill_name, target_agent));
    }

    if use_symlink {
        // Create symlink
        #[cfg(unix)]
        std::os::unix::fs::symlink(source, &dest)
            .map_err(|e| format!("Failed to create symlink: {}", e))?;

        Ok(format!("Symlinked '{}' to {}", skill_name, target_agent))
    } else {
        // Deep copy
        copy_dir_recursive(source, &dest)
            .map_err(|e| format!("Failed to copy: {}", e))?;

        Ok(format!("Copied '{}' to {}", skill_name, target_agent))
    }
}

/// Recursively copy a directory
fn copy_dir_recursive(src: &Path, dst: &Path) -> std::io::Result<()> {
    fs::create_dir_all(dst)?;
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let src_path = entry.path();
        let dst_path = dst.join(entry.file_name());
        if src_path.is_dir() {
            copy_dir_recursive(&src_path, &dst_path)?;
        } else {
            fs::copy(&src_path, &dst_path)?;
        }
    }
    Ok(())
}

/// Uninstall (remove) a skill from an agent
pub fn uninstall_skill(skill_path: &str) -> Result<String, String> {
    let path = Path::new(skill_path);

    if !path.exists() && !path.is_symlink() {
        return Err(format!("Path does not exist: {}", skill_path));
    }

    let skill_name = path
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();

    if path.is_symlink() {
        // Safe: just remove the symlink, not the target
        fs::remove_file(path)
            .map_err(|e| format!("Failed to remove symlink: {}", e))?;
        Ok(format!("Removed symlink '{}'", skill_name))
    } else {
        // Physical directory — remove recursively
        fs::remove_dir_all(path)
            .map_err(|e| format!("Failed to remove directory: {}", e))?;
        Ok(format!("Removed '{}' and all contents", skill_name))
    }
}

/// Batch migrate skills
pub fn batch_migrate_skills(skills: Vec<SkillInfo>, target_agent: &str) -> Result<String, String> {
    let configs = get_agent_configs();
    let target_config = configs
        .iter()
        .find(|c| c.name == target_agent)
        .ok_or_else(|| format!("Target agent '{}' not found", target_agent))?;

    let mut success_count = 0;

    for skill in skills {
        let source_path = Path::new(&skill.path);
        if !source_path.exists() {
            continue;
        }

        let skill_name = source_path
            .file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();

        if target_config.name == "Shared Library" && skill.agent != "Shared Library" {
            // We want to physically move it to Shared Library, then leave a symlink
            let target_dir = if let Some(cat) = &skill.category {
                target_config.skills_path.join(cat)
            } else {
                target_config.skills_path.clone()
            };

            if !target_dir.exists() {
                let _ = fs::create_dir_all(&target_dir);
            }

            let dest_path = target_dir.join(&skill_name);

            if dest_path.exists() {
                continue;
            }

            if !skill.is_symlink {
                // Move physical directory
                if fs::rename(&source_path, &dest_path).is_err() {
                    // Ignore fallback for now, rename should work across home dir usually
                    continue; 
                }

                // Put symlink back in original spot
                #[cfg(unix)]
                let _ = std::os::unix::fs::symlink(&dest_path, &source_path);
                #[cfg(windows)]
                let _ = std::os::windows::fs::symlink_dir(&dest_path, &source_path);

                success_count += 1;
            } else {
                // If dragging a symlink to Shared Library, just drop a symlink there
                if let Ok(_) = install_skill(&skill.path, "Shared Library", true) {
                    success_count += 1;
                }
            }
        } else {
            // Dragging to standard agent (or from Shared Library to standard) -> Just symlink
            if let Ok(_) = install_skill(&skill.path, target_agent, true) {
                success_count += 1;
            }
        }
    }

    Ok(format!("Migrated {} skills", success_count))
}
