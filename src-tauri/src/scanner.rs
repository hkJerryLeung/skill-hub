use crate::categorizer;
use crate::settings;
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, HashSet};
use std::fs;
use std::path::{Path, PathBuf};

const SHARED_LIBRARY_CATEGORY_SLUGS: &[&str] = &[
    "document-processing",
    "development-code-tools",
    "data-analysis",
    "business-marketing",
    "communication-writing",
    "creative-media",
    "productivity-organization",
    "collaboration-project-management",
    "security-systems",
    "uncategorized",
];
const SKILL_GATE_METADATA_FILE: &str = ".skill-gate.json";
const LEGACY_SKILL_HUB_METADATA_FILE: &str = ".skill-hub.json";
const BIN_AGENT_NAME: &str = "Bin";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum CategoryAssignmentMode {
    Auto,
    Manual,
}

#[derive(Debug, Default, Clone, Serialize, Deserialize, PartialEq)]
pub struct CategoryAssignment {
    pub mode: Option<CategoryAssignmentMode>,
    pub slug: Option<String>,
    pub confidence: Option<f64>,
    pub classified_at: Option<String>,
    pub reason: Option<String>,
    pub model: Option<String>,
}

#[derive(Debug, Default, Clone, Serialize, Deserialize, PartialEq)]
pub struct SkillGateMetadata {
    pub category_assignment: Option<CategoryAssignment>,
}

/// Represents a single discovered skill
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillInfo {
    pub name: String,
    pub description: String,
    pub path: String,
    pub canonical_path: String,
    pub agent: String,
    pub is_symlink: bool,
    pub category: Option<String>,
    pub category_assignment_mode: Option<CategoryAssignmentMode>,
    pub category_confidence: Option<f64>,
    pub category_classified_at: Option<String>,
    pub version: Option<String>,
    pub source: Option<String>,
}

#[derive(Debug, Default, Clone, PartialEq, Eq)]
struct SkillFrontmatter {
    name: Option<String>,
    description: Option<String>,
    version: Option<String>,
    source: Option<String>,
}

fn is_valid_shared_library_category_slug(value: &str) -> bool {
    SHARED_LIBRARY_CATEGORY_SLUGS.contains(&value)
}

fn normalize_skill_gate_metadata(mut metadata: SkillGateMetadata) -> SkillGateMetadata {
    let Some(assignment) = metadata.category_assignment.as_mut() else {
        return metadata;
    };

    let Some(slug) = assignment.slug.as_deref() else {
        metadata.category_assignment = None;
        return metadata;
    };

    if !is_valid_shared_library_category_slug(slug) || assignment.mode.is_none() {
        metadata.category_assignment = None;
    }

    metadata
}

fn parse_skill_gate_metadata(content: &str) -> SkillGateMetadata {
    serde_json::from_str::<SkillGateMetadata>(content)
        .map(normalize_skill_gate_metadata)
        .unwrap_or_default()
}

fn read_skill_gate_metadata(skill_dir: &Path) -> SkillGateMetadata {
    let metadata_path = skill_dir.join(SKILL_GATE_METADATA_FILE);
    let legacy_metadata_path = skill_dir.join(LEGACY_SKILL_HUB_METADATA_FILE);
    let content = match fs::read_to_string(&metadata_path) {
        Ok(content) => content,
        Err(_) => match fs::read_to_string(&legacy_metadata_path) {
            Ok(content) => content,
            Err(_) => return SkillGateMetadata::default(),
        },
    };

    parse_skill_gate_metadata(&content)
}

fn write_skill_gate_metadata(skill_dir: &Path, metadata: &SkillGateMetadata) -> Result<(), String> {
    let metadata_path = skill_dir.join(SKILL_GATE_METADATA_FILE);
    let legacy_metadata_path = skill_dir.join(LEGACY_SKILL_HUB_METADATA_FILE);
    let json = serde_json::to_string_pretty(metadata)
        .map_err(|error| format!("Failed to serialize skill metadata: {}", error))?;

    fs::write(&metadata_path, json).map_err(|error| {
        format!(
            "Failed to write skill metadata '{}': {}",
            metadata_path.display(),
            error
        )
    })?;

    if legacy_metadata_path.exists() {
        let _ = fs::remove_file(&legacy_metadata_path);
    }

    Ok(())
}

fn write_category_assignment(
    skill_dir: &Path,
    mode: CategoryAssignmentMode,
    slug: &str,
    confidence: Option<f64>,
    reason: Option<String>,
    model: Option<String>,
) -> Result<(), String> {
    write_skill_gate_metadata(
        skill_dir,
        &SkillGateMetadata {
            category_assignment: Some(CategoryAssignment {
                mode: Some(mode),
                slug: Some(slug.to_string()),
                confidence,
                classified_at: None,
                reason,
                model,
            }),
        },
    )
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
    let app_settings = settings::load_settings().unwrap_or_default();
    let shared_library_path = PathBuf::from(app_settings.shared_library_path);
    vec![
        AgentConfig {
            name: "Shared Library",
            skills_path: shared_library_path,
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
            skills_path: home.join(".codex").join("skills"),
            recursive: true,
        },
        AgentConfig {
            name: "Cursor",
            skills_path: home.join(".cursor").join("skills"),
            recursive: false,
        },
    ]
}

fn strip_wrapping_quotes(value: &str) -> String {
    let trimmed = value.trim();
    if trimmed.len() >= 2 {
        let starts_with_double = trimmed.starts_with('"') && trimmed.ends_with('"');
        let starts_with_single = trimmed.starts_with('\'') && trimmed.ends_with('\'');
        if starts_with_double || starts_with_single {
            return trimmed[1..trimmed.len() - 1].to_string();
        }
    }

    trimmed.to_string()
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum BlockScalarStyle {
    Folded,
    Literal,
}

fn leading_whitespace_count(line: &str) -> usize {
    line.chars().take_while(|char| char.is_whitespace()).count()
}

fn parse_block_scalar_style(value: &str) -> Option<BlockScalarStyle> {
    match value.trim().chars().next() {
        Some('>') => Some(BlockScalarStyle::Folded),
        Some('|') => Some(BlockScalarStyle::Literal),
        _ => None,
    }
}

fn fold_block_scalar_lines(lines: &[String]) -> String {
    let mut folded = String::new();
    let mut previous_was_blank = false;

    for line in lines {
        if line.is_empty() {
            if !folded.is_empty() && !folded.ends_with('\n') {
                folded.push('\n');
            }
            previous_was_blank = true;
            continue;
        }

        if !folded.is_empty() && !folded.ends_with('\n') && !previous_was_blank {
            folded.push(' ');
        }

        folded.push_str(line);
        previous_was_blank = false;
    }

    folded.trim().to_string()
}

fn collect_block_scalar(
    lines: &[&str],
    start_index: usize,
    parent_indent: usize,
) -> (Vec<String>, usize) {
    let mut collected = Vec::new();
    let mut index = start_index;

    while index < lines.len() {
        let line = lines[index];
        let trimmed = line.trim();
        if trimmed == "---" {
            break;
        }

        let indent = leading_whitespace_count(line);
        if !trimmed.is_empty() && indent <= parent_indent {
            break;
        }

        collected.push(line.to_string());
        index += 1;
    }

    if collected.is_empty() {
        return (Vec::new(), index);
    }

    let content_indent = collected
        .iter()
        .filter(|line| !line.trim().is_empty())
        .map(|line| leading_whitespace_count(line))
        .min()
        .unwrap_or(parent_indent + 1);

    let normalized = collected
        .into_iter()
        .map(|line| {
            if line.trim().is_empty() {
                String::new()
            } else {
                line.chars().skip(content_indent).collect::<String>()
            }
        })
        .collect();

    (normalized, index)
}

fn parse_skill_frontmatter(content: &str) -> SkillFrontmatter {
    let mut metadata = SkillFrontmatter::default();
    let lines: Vec<&str> = content.lines().collect();

    if lines.first().map(|line| line.trim()) != Some("---") {
        return metadata;
    }

    let mut index = 1;
    while index < lines.len() {
        let line = lines[index];
        let trimmed = line.trim();
        if trimmed == "---" {
            break;
        }

        let Some((key, raw_value)) = line.split_once(':') else {
            index += 1;
            continue;
        };

        let key = key.trim();
        let raw_value = raw_value.trim_start();

        if let Some(style) = parse_block_scalar_style(raw_value) {
            let (block_lines, next_index) =
                collect_block_scalar(&lines, index + 1, leading_whitespace_count(line));
            let value = match style {
                BlockScalarStyle::Folded => fold_block_scalar_lines(&block_lines),
                BlockScalarStyle::Literal => block_lines.join("\n").trim().to_string(),
            };

            match key {
                "name" => metadata.name = Some(value),
                "description" => metadata.description = Some(value),
                "version" => metadata.version = Some(value),
                "source" => metadata.source = Some(value),
                _ => {}
            }

            index = next_index;
            continue;
        }

        let value = strip_wrapping_quotes(raw_value);
        match key {
            "name" => metadata.name = Some(value),
            "description" => metadata.description = Some(value),
            "version" => metadata.version = Some(value),
            "source" => metadata.source = Some(value),
            _ => {}
        }

        index += 1;
    }

    metadata
}

fn fallback_description(content: &str) -> Option<String> {
    let mut in_frontmatter = false;

    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed == "---" {
            in_frontmatter = !in_frontmatter;
            continue;
        }

        if in_frontmatter || trimmed.is_empty() {
            continue;
        }

        return Some(trimmed.to_string());
    }

    None
}

fn resolve_canonical_path(path: &Path) -> String {
    fs::canonicalize(path)
        .unwrap_or_else(|_| path.to_path_buf())
        .to_string_lossy()
        .to_string()
}

fn read_skill_metadata(skill_dir: &Path) -> SkillFrontmatter {
    let skill_md = skill_dir.join("SKILL.md");
    if !skill_md.exists() {
        return SkillFrontmatter::default();
    }

    let content = match fs::read_to_string(&skill_md) {
        Ok(c) => c,
        Err(_) => return SkillFrontmatter::default(),
    };

    let mut metadata = parse_skill_frontmatter(&content);
    if metadata.description.is_none() {
        metadata.description = fallback_description(&content);
    }
    metadata
}

fn legacy_copy_temp_path(link_path: &Path) -> PathBuf {
    let parent = link_path.parent().unwrap_or_else(|| Path::new("."));
    let skill_name = link_path.file_name().unwrap_or_default().to_string_lossy();

    for attempt in 0..1000 {
        let candidate = parent.join(format!(".{}.skill-gate-migrate-{}", skill_name, attempt));
        if !candidate.exists() && !candidate.is_symlink() {
            return candidate;
        }
    }

    parent.join(format!(".{}.skill-gate-migrate", skill_name))
}

fn file_contents_match(left: &Path, right: &Path) -> Result<bool, String> {
    let left_bytes =
        fs::read(left).map_err(|e| format!("Failed to read '{}': {}", left.display(), e))?;
    let right_bytes =
        fs::read(right).map_err(|e| format!("Failed to read '{}': {}", right.display(), e))?;
    Ok(left_bytes == right_bytes)
}

fn directories_match(left: &Path, right: &Path) -> Result<bool, String> {
    if !left.is_dir() || !right.is_dir() {
        return Ok(false);
    }

    let read_entries = |path: &Path| -> Result<BTreeMap<String, PathBuf>, String> {
        let mut entries = BTreeMap::new();
        for entry in fs::read_dir(path)
            .map_err(|e| format!("Failed to read directory '{}': {}", path.display(), e))?
        {
            let entry = entry
                .map_err(|e| format!("Failed to read entry in '{}': {}", path.display(), e))?;
            entries.insert(
                entry.file_name().to_string_lossy().to_string(),
                entry.path(),
            );
        }
        Ok(entries)
    };

    let left_entries = read_entries(left)?;
    let right_entries = read_entries(right)?;
    if left_entries.len() != right_entries.len() {
        return Ok(false);
    }

    for (name, left_path) in left_entries {
        let Some(right_path) = right_entries.get(&name) else {
            return Ok(false);
        };

        let left_meta = fs::symlink_metadata(&left_path)
            .map_err(|e| format!("Failed to stat '{}': {}", left_path.display(), e))?;
        let right_meta = fs::symlink_metadata(right_path)
            .map_err(|e| format!("Failed to stat '{}': {}", right_path.display(), e))?;

        if left_meta.file_type().is_dir() && right_meta.file_type().is_dir() {
            if !directories_match(&left_path, right_path)? {
                return Ok(false);
            }
            continue;
        }

        if left_meta.file_type().is_file() && right_meta.file_type().is_file() {
            if !file_contents_match(&left_path, right_path)? {
                return Ok(false);
            }
            continue;
        }

        return Ok(false);
    }

    Ok(true)
}

fn shared_source_link_candidates(skill_name: &str, shared_root: &Path) -> Vec<PathBuf> {
    let mut targets = BTreeMap::new();

    for skill in scan_all_skills_raw().into_iter().filter(|skill| {
        skill.agent != "Shared Library"
            && skill.agent != BIN_AGENT_NAME
            && skill.name == skill_name
            && skill.is_symlink
    }) {
        let canonical = PathBuf::from(&skill.canonical_path);
        if canonical.is_dir() && !is_path_in_shared_library(&canonical, shared_root) {
            targets.entry(skill.canonical_path).or_insert(canonical);
        }
    }

    targets.into_values().collect()
}

fn relink_shared_skill_to_external_source(
    shared_skill_path: &Path,
    external_source: &Path,
) -> Result<(), String> {
    fs::remove_dir_all(shared_skill_path).map_err(|e| {
        format!(
            "Failed to remove copied shared skill '{}': {}",
            shared_skill_path.display(),
            e
        )
    })?;
    create_directory_symlink(external_source, shared_skill_path)?;
    Ok(())
}

fn repair_shared_library_sources_from_agent_symlinks() -> Result<usize, String> {
    let shared_root = get_shared_library_root()?;
    let mut repaired = 0;

    for shared_skill in scan_all_skills_raw()
        .into_iter()
        .filter(|skill| skill.agent == "Shared Library" && !skill.is_symlink)
    {
        let shared_skill_path = PathBuf::from(&shared_skill.path);
        let candidates = shared_source_link_candidates(&shared_skill.name, &shared_root);
        if candidates.len() != 1 {
            continue;
        }

        let external_source = &candidates[0];
        if !directories_match(&shared_skill_path, external_source)? {
            continue;
        }

        relink_shared_skill_to_external_source(&shared_skill_path, external_source)?;
        repaired += 1;
    }

    Ok(repaired)
}

fn collect_shared_library_canonical_targets(shared_root: &Path) -> HashSet<PathBuf> {
    scan_all_skills_raw()
        .into_iter()
        .filter(|skill| {
            skill.agent == "Shared Library"
                && (skill.is_symlink
                    || is_path_in_shared_library(Path::new(&skill.path), shared_root))
        })
        .map(|skill| PathBuf::from(skill.canonical_path))
        .collect()
}

fn migrate_legacy_symlink_to_local_copy(
    link_path: &Path,
    shared_root: &Path,
    shared_targets: &HashSet<PathBuf>,
) -> Result<bool, String> {
    if !link_path.is_symlink() {
        return Ok(false);
    }

    let canonical_target = match fs::canonicalize(link_path) {
        Ok(path) => path,
        Err(_) => return Ok(false),
    };

    if is_path_in_shared_library(&canonical_target, shared_root)
        || shared_targets.contains(&canonical_target)
        || !canonical_target.is_dir()
    {
        return Ok(false);
    }

    let temp_copy = legacy_copy_temp_path(link_path);
    copy_dir_recursive(&canonical_target, &temp_copy).map_err(|e| {
        format!(
            "Failed to copy legacy symlink target '{}': {}",
            canonical_target.display(),
            e
        )
    })?;

    fs::remove_file(link_path).map_err(|e| {
        format!(
            "Failed to remove legacy symlink '{}': {}",
            link_path.display(),
            e
        )
    })?;

    if let Err(rename_err) = fs::rename(&temp_copy, link_path) {
        let _ = fs::remove_dir_all(&temp_copy);
        return Err(format!(
            "Failed to replace legacy symlink '{}' with local copy: {}",
            link_path.display(),
            rename_err
        ));
    }

    Ok(true)
}

fn normalize_flat_legacy_symlinks(
    config: &AgentConfig,
    shared_root: &Path,
    shared_targets: &HashSet<PathBuf>,
) -> Result<usize, String> {
    let mut migrated = 0;

    if !config.skills_path.exists() {
        return Ok(migrated);
    }

    let entries = match fs::read_dir(&config.skills_path) {
        Ok(entries) => entries,
        Err(_) => return Ok(migrated),
    };

    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }

        if entry
            .file_type()
            .map(|file_type| file_type.is_symlink())
            .unwrap_or(false)
            && migrate_legacy_symlink_to_local_copy(&path, shared_root, shared_targets)?
        {
            migrated += 1;
        }
    }

    Ok(migrated)
}

fn normalize_recursive_legacy_symlinks(
    config: &AgentConfig,
    shared_root: &Path,
    shared_targets: &HashSet<PathBuf>,
) -> Result<usize, String> {
    let mut migrated = 0;

    if !config.skills_path.exists() {
        return Ok(migrated);
    }

    let entries = match fs::read_dir(&config.skills_path) {
        Ok(entries) => entries,
        Err(_) => return Ok(migrated),
    };

    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }

        let is_symlink = entry
            .file_type()
            .map(|file_type| file_type.is_symlink())
            .unwrap_or(false);

        if path.join("SKILL.md").exists() {
            if is_symlink
                && migrate_legacy_symlink_to_local_copy(&path, shared_root, shared_targets)?
            {
                migrated += 1;
            }
            continue;
        }

        let sub_entries = match fs::read_dir(&path) {
            Ok(entries) => entries,
            Err(_) => continue,
        };

        for sub_entry in sub_entries.flatten() {
            let sub_path = sub_entry.path();
            if !sub_path.is_dir() || !sub_path.join("SKILL.md").exists() {
                continue;
            }

            if sub_entry
                .file_type()
                .map(|file_type| file_type.is_symlink())
                .unwrap_or(false)
                && migrate_legacy_symlink_to_local_copy(&sub_path, shared_root, shared_targets)?
            {
                migrated += 1;
            }
        }
    }

    Ok(migrated)
}

pub fn normalize_legacy_agent_symlinks() -> Result<usize, String> {
    let shared_root = get_shared_library_root()?;
    repair_shared_library_sources_from_agent_symlinks()?;
    let shared_targets = collect_shared_library_canonical_targets(&shared_root);
    let mut migrated = 0;

    for config in get_agent_configs()
        .into_iter()
        .filter(|config| config.name != "Shared Library")
    {
        migrated += if config.recursive {
            normalize_recursive_legacy_symlinks(&config, &shared_root, &shared_targets)?
        } else {
            normalize_flat_legacy_symlinks(&config, &shared_root, &shared_targets)?
        };
    }

    Ok(migrated)
}

fn sort_skills(skills: &mut [SkillInfo]) {
    skills.sort_by(|a, b| {
        b.is_symlink
            .cmp(&a.is_symlink)
            .then_with(|| a.name.cmp(&b.name))
            .then_with(|| a.agent.cmp(&b.agent))
            .then_with(|| a.path.cmp(&b.path))
    });
}

fn build_skill_info(
    skill_path: &Path,
    name: String,
    agent: &str,
    is_symlink: bool,
    category: Option<String>,
) -> SkillInfo {
    let metadata = read_skill_metadata(skill_path);
    let skill_gate_metadata = read_skill_gate_metadata(skill_path);
    let category_assignment = skill_gate_metadata.category_assignment;
    let version = metadata.version;
    let source = metadata.source;

    SkillInfo {
        name: metadata.name.unwrap_or(name),
        description: metadata
            .description
            .unwrap_or_else(|| String::from("No description")),
        path: skill_path.to_string_lossy().to_string(),
        canonical_path: resolve_canonical_path(skill_path),
        agent: agent.to_string(),
        is_symlink,
        category,
        category_assignment_mode: category_assignment
            .as_ref()
            .and_then(|assignment| assignment.mode.clone()),
        category_confidence: category_assignment
            .as_ref()
            .and_then(|assignment| assignment.confidence),
        category_classified_at: category_assignment
            .as_ref()
            .and_then(|assignment| assignment.classified_at.clone()),
        version,
        source,
    }
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
        if !path.is_dir() {
            continue;
        }
        let name = path
            .file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();
        let is_symlink = entry.file_type().map(|ft| ft.is_symlink()).unwrap_or(false);
        skills.push(build_skill_info(&path, name, config.name, is_symlink, None));
    }
    sort_skills(&mut skills);
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
        if !path.is_dir() {
            continue;
        }
        let dir_name = path
            .file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();
        let is_symlink = entry.file_type().map(|ft| ft.is_symlink()).unwrap_or(false);

        // Check if this is a skill (has SKILL.md) or a category folder
        if path.join("SKILL.md").exists() {
            // Direct skill at root level (no category)
            skills.push(build_skill_info(
                &path,
                dir_name,
                config.name,
                is_symlink,
                None,
            ));
        } else {
            // Treat as category folder — scan one level deeper
            let category_name = dir_name;
            if let Ok(sub_entries) = fs::read_dir(&path) {
                for sub_entry in sub_entries.flatten() {
                    let sub_path = sub_entry.path();
                    if !sub_path.is_dir() {
                        continue;
                    }
                    if !sub_path.join("SKILL.md").exists() {
                        continue;
                    }
                    let sub_name = sub_path
                        .file_name()
                        .unwrap_or_default()
                        .to_string_lossy()
                        .to_string();
                    let sub_symlink = sub_entry
                        .file_type()
                        .map(|ft| ft.is_symlink())
                        .unwrap_or(false);
                    skills.push(build_skill_info(
                        &sub_path,
                        sub_name,
                        config.name,
                        sub_symlink,
                        Some(category_name.clone()),
                    ));
                }
            }
        }
    }
    sort_skills(&mut skills);
    skills
}

fn scan_all_skills_raw() -> Vec<SkillInfo> {
    let configs = get_agent_configs();
    let mut all_skills = Vec::new();
    for config in &configs {
        if config.recursive {
            all_skills.extend(scan_recursive(config));
        } else {
            all_skills.extend(scan_flat(config));
        }
    }
    if let Ok(bin_root) = get_bin_root() {
        let bin_config = AgentConfig {
            name: BIN_AGENT_NAME,
            skills_path: bin_root,
            recursive: false,
        };
        all_skills.extend(scan_flat(&bin_config));
    }
    sort_skills(&mut all_skills);
    all_skills
}

fn repair_shared_library_links() -> Result<usize, String> {
    let shared_skills = scan_all_skills_raw()
        .into_iter()
        .filter(|skill| skill.agent == "Shared Library")
        .map(|skill| skill.path)
        .collect::<Vec<_>>();
    let mut repaired = 0;

    for shared_skill_path in shared_skills {
        let shared_skill = Path::new(&shared_skill_path);
        if !shared_skill.exists() || shared_skill.is_symlink() {
            continue;
        }

        let skill_name = shared_skill
            .file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();
        repaired += sync_shared_skill_to_agents(
            shared_skill,
            &skill_name,
            None,
            // Shared Library is the source of truth. A scan should bring agent
            // installs back into sync, including backing up same-name local copies.
            LocalConflictStrategy::BackupAndReplace,
        )?
        .linked;
    }

    Ok(repaired)
}

/// Scan all known agents and return all discovered skills
pub fn scan_all_skills() -> Vec<SkillInfo> {
    if let Err(error) = repair_shared_library_sources_from_agent_symlinks() {
        eprintln!("failed to repair shared library sources: {}", error);
    }
    if let Err(error) = repair_shared_library_links() {
        eprintln!("failed to repair shared library links: {}", error);
    }

    scan_all_skills_raw()
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

    collect_skill_files(path, path, &mut files);

    files.sort();
    files
}

fn collect_skill_files(root: &Path, dir: &Path, files: &mut Vec<String>) {
    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            let Ok(file_type) = entry.file_type() else {
                continue;
            };

            if file_type.is_dir() {
                collect_skill_files(root, &path, files);
                continue;
            }

            if !file_type.is_file() {
                continue;
            }

            let Ok(relative_path) = path.strip_prefix(root) else {
                continue;
            };
            let normalized_path = relative_path.to_string_lossy().replace('\\', "/");
            files.push(format!("📄 {}", normalized_path));
        }
    }
}

/// Get available agent targets for installation
pub fn get_agent_paths() -> Vec<AgentTarget> {
    let mut targets = get_agent_configs()
        .into_iter()
        .map(|c| AgentTarget {
            name: c.name.to_string(),
            path: c.skills_path.to_string_lossy().to_string(),
            exists: c.skills_path.exists(),
        })
        .collect::<Vec<_>>();

    if let Ok(bin_root) = get_bin_root() {
        targets.push(AgentTarget {
            name: BIN_AGENT_NAME.to_string(),
            path: bin_root.to_string_lossy().to_string(),
            exists: bin_root.exists(),
        });
    }

    targets
}

#[derive(Debug, Clone, Serialize)]
pub struct AgentTarget {
    pub name: String,
    pub path: String,
    pub exists: bool,
}

#[derive(Debug, Default)]
struct SharedSyncSummary {
    linked: usize,
    already_linked: usize,
    backed_up_conflicts: usize,
    skipped_conflicts: Vec<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum LocalConflictStrategy {
    Skip,
    BackupAndReplace,
}

fn get_shared_library_root() -> Result<PathBuf, String> {
    get_agent_configs()
        .into_iter()
        .find(|config| config.name == "Shared Library")
        .map(|config| config.skills_path)
        .ok_or_else(|| String::from("Shared Library target is not configured"))
}

fn get_bin_root() -> Result<PathBuf, String> {
    Ok(settings::load_settings()
        .map(|settings| PathBuf::from(settings.bin_path))
        .unwrap_or_else(|_| PathBuf::from(settings::default_bin_path())))
}

fn is_path_in_shared_library(path: &Path, shared_root: &Path) -> bool {
    // Check using raw paths first (handles symlinks inside the shared library
    // that point to external locations — canonicalization would resolve through
    // the symlink, making the path appear outside the library).
    if path.starts_with(shared_root) {
        return true;
    }

    // Fall back to canonical comparison for cases where either side needs resolution
    let canonical_path = fs::canonicalize(path).unwrap_or_else(|_| path.to_path_buf());
    let canonical_shared_root =
        fs::canonicalize(shared_root).unwrap_or_else(|_| shared_root.to_path_buf());

    canonical_path.starts_with(&canonical_shared_root)
}

fn format_shared_sync_message(skill_name: &str, sync: &SharedSyncSummary) -> String {
    let mut parts = vec![format!("linked {} agents", sync.linked)];

    if sync.already_linked > 0 {
        parts.push(format!("{} already linked", sync.already_linked));
    }

    if sync.backed_up_conflicts > 0 {
        parts.push(format!("backed up {} conflicts", sync.backed_up_conflicts));
    }

    if !sync.skipped_conflicts.is_empty() {
        parts.push(format!(
            "skipped conflicts in {}",
            sync.skipped_conflicts.join(", ")
        ));
    }

    format!("Shared '{}' and {}", skill_name, parts.join(", "))
}

fn create_shared_skill_link(
    shared_skill_path: &Path,
    target_config: &AgentConfig,
    skill_name: &str,
) -> Result<(), String> {
    if !target_config.skills_path.exists() {
        fs::create_dir_all(&target_config.skills_path)
            .map_err(|e| format!("Failed to create target dir: {}", e))?;
    }

    let dest = target_config.skills_path.join(skill_name);
    create_directory_symlink(shared_skill_path, &dest)
}

fn local_conflict_backup_path(dest: &Path) -> PathBuf {
    let parent = dest.parent().unwrap_or_else(|| Path::new("."));
    let skill_name = dest.file_name().unwrap_or_default().to_string_lossy();

    for attempt in 0..1000 {
        let candidate = parent.join(format!(
            "{}.skill-gate-local-backup-{}",
            skill_name, attempt
        ));
        if !candidate.exists() && !candidate.is_symlink() {
            return candidate;
        }
    }

    parent.join(format!("{}.skill-gate-local-backup", skill_name))
}

fn backup_local_conflict(dest: &Path) -> Result<PathBuf, String> {
    let backup_path = local_conflict_backup_path(dest);
    fs::rename(dest, &backup_path).map_err(|e| {
        format!(
            "Failed to back up conflicting local skill '{}' to '{}': {}",
            dest.display(),
            backup_path.display(),
            e
        )
    })?;
    Ok(backup_path)
}

fn merge_shared_sync_summary(summary: &mut SharedSyncSummary, next: SharedSyncSummary) {
    summary.linked += next.linked;
    summary.already_linked += next.already_linked;
    summary.backed_up_conflicts += next.backed_up_conflicts;
    summary.skipped_conflicts.extend(next.skipped_conflicts);
}

fn sync_shared_skill_to_agents(
    shared_skill_path: &Path,
    skill_name: &str,
    only_target: Option<&str>,
    local_conflict_strategy: LocalConflictStrategy,
) -> Result<SharedSyncSummary, String> {
    let shared_canonical =
        fs::canonicalize(shared_skill_path).unwrap_or_else(|_| shared_skill_path.to_path_buf());
    let mut summary = SharedSyncSummary::default();

    for target in get_agent_configs()
        .into_iter()
        .filter(|config| config.name != "Shared Library")
        .filter(|config| only_target.is_none_or(|name| config.name == name))
    {
        let dest = target.skills_path.join(skill_name);

        if dest.is_symlink() {
            let is_shared_link = fs::canonicalize(&dest)
                .map(|path| path == shared_canonical)
                .unwrap_or(false);

            if is_shared_link {
                summary.already_linked += 1;
                continue;
            }

            fs::remove_file(&dest).map_err(|e| {
                format!("Failed to remove stale symlink '{}': {}", dest.display(), e)
            })?;
            create_shared_skill_link(shared_skill_path, &target, skill_name)?;
            summary.linked += 1;
            continue;
        }

        if dest.exists() {
            match local_conflict_strategy {
                LocalConflictStrategy::Skip => {
                    summary.skipped_conflicts.push(target.name.to_string());
                    continue;
                }
                LocalConflictStrategy::BackupAndReplace => {
                    backup_local_conflict(&dest)?;
                    create_shared_skill_link(shared_skill_path, &target, skill_name)?;
                    summary.linked += 1;
                    summary.backed_up_conflicts += 1;
                    continue;
                }
            }
        }

        create_shared_skill_link(shared_skill_path, &target, skill_name)?;
        summary.linked += 1;
    }

    Ok(summary)
}

fn infer_skill_category(source_path: &str) -> Option<String> {
    scan_all_skills_raw()
        .into_iter()
        .find(|skill| skill.path == source_path)
        .and_then(|skill| skill.category)
}

fn resolve_shared_library_install_category(
    source_path: &str,
    source: &Path,
    settings: &settings::AppSettings,
) -> (String, Option<f64>, Option<String>, Option<String>) {
    if settings.categorization_enabled {
        if let Ok(classification) = categorizer::categorize_skill_directory(source, settings) {
            let slug = if is_valid_shared_library_category_slug(&classification.category_slug) {
                classification.category_slug
            } else {
                String::from("uncategorized")
            };
            return (
                slug,
                classification.confidence,
                classification.reason,
                Some(settings.categorization_model.clone()),
            );
        }
    }

    (
        infer_skill_category(source_path).unwrap_or_else(|| String::from("uncategorized")),
        None,
        None,
        None,
    )
}

fn resolve_shared_category_from_path(skill_path: &Path, shared_root: &Path) -> String {
    let canonical_path = fs::canonicalize(skill_path).unwrap_or_else(|_| skill_path.to_path_buf());
    let relative = canonical_path
        .strip_prefix(shared_root)
        .ok()
        .and_then(|path| path.components().next());

    match relative {
        Some(std::path::Component::Normal(value)) => {
            let slug = value.to_string_lossy().to_string();
            if is_valid_shared_library_category_slug(&slug) {
                slug
            } else {
                String::from("uncategorized")
            }
        }
        _ => String::from("uncategorized"),
    }
}

fn ensure_skill_in_shared_library(
    source_path: &Path,
    skill_name: &str,
    category: Option<&str>,
) -> Result<PathBuf, String> {
    let shared_root = get_shared_library_root()?;
    let canonical_source = fs::canonicalize(source_path).map_err(|e| {
        format!(
            "Failed to resolve source path '{}': {}",
            source_path.display(),
            e
        )
    })?;

    if is_path_in_shared_library(&canonical_source, &shared_root) {
        return Ok(canonical_source);
    }

    let target_dir = match category {
        Some(category_name) => shared_root.join(category_name),
        None => shared_root.clone(),
    };

    fs::create_dir_all(&target_dir)
        .map_err(|e| format!("Failed to create shared library directory: {}", e))?;

    let dest_path = target_dir.join(skill_name);
    if dest_path.exists() || dest_path.is_symlink() {
        return Err(format!(
            "Skill '{}' already exists in Shared Library",
            skill_name
        ));
    }

    if let Err(rename_err) = fs::rename(&canonical_source, &dest_path) {
        copy_dir_recursive(&canonical_source, &dest_path).map_err(|copy_err| {
            format!(
                "Failed to move skill: {}; fallback copy failed: {}",
                rename_err, copy_err
            )
        })?;
        fs::remove_dir_all(&canonical_source)
            .map_err(|e| format!("Failed to remove original directory after copy: {}", e))?;
    }

    create_directory_symlink(&dest_path, &canonical_source)?;
    Ok(dest_path)
}

fn remove_empty_shared_parent_dir(shared_skill_path: &Path, shared_root: &Path) {
    let Some(parent) = shared_skill_path.parent() else {
        return;
    };

    if parent == shared_root {
        return;
    }

    let is_empty = fs::read_dir(parent)
        .ok()
        .and_then(|mut entries| entries.next().map(|_| false))
        .unwrap_or(true);

    if is_empty {
        let _ = fs::remove_dir(parent);
    }
}

fn move_shared_skill_to_agent_local(
    shared_skill_path: &Path,
    target_agent: &str,
) -> Result<String, String> {
    let configs = get_agent_configs();
    let target = configs
        .iter()
        .find(|config| config.name == target_agent)
        .ok_or_else(|| format!("Unknown agent: {}", target_agent))?;

    if target.name == "Shared Library" {
        return Err(String::from("Target agent must not be Shared Library"));
    }

    let shared_root = get_shared_library_root()?;

    // Check if the RAW path (before symlink resolution) is inside the shared library.
    // This is important when the shared library contains symlinks pointing to external
    // locations — fs::canonicalize would resolve through the symlink, making the
    // canonical path appear outside the shared library.
    let raw_abs = if shared_skill_path.is_absolute() {
        shared_skill_path.to_path_buf()
    } else {
        std::env::current_dir()
            .map_err(|e| format!("Failed to resolve current directory: {}", e))?
            .join(shared_skill_path)
    };
    if !is_path_in_shared_library(&raw_abs, &shared_root) {
        return Err(format!(
            "Skill '{}' is not stored in Shared Library",
            shared_skill_path.display()
        ));
    }

    let skill_name = shared_skill_path
        .file_name()
        .ok_or("Invalid shared skill path")?
        .to_string_lossy()
        .to_string();

    // Resolve through symlinks for the actual move operation
    let resolved_source =
        fs::canonicalize(shared_skill_path).unwrap_or_else(|_| shared_skill_path.to_path_buf());

    if !target.skills_path.exists() {
        fs::create_dir_all(&target.skills_path)
            .map_err(|e| format!("Failed to create target dir: {}", e))?;
    }

    let dest_path = target.skills_path.join(&skill_name);
    let shared_canonical = resolved_source.to_string_lossy().to_string();
    let linked_paths = scan_all_skills_raw()
        .into_iter()
        .filter(|skill| skill.is_symlink && skill.canonical_path == shared_canonical)
        .map(|skill| skill.path)
        .collect::<Vec<_>>();

    if dest_path.exists() || dest_path.is_symlink() {
        let is_shared_link = dest_path.is_symlink()
            && fs::canonicalize(&dest_path)
                .map(|path| path == resolved_source)
                .unwrap_or(false);

        if is_shared_link {
            fs::remove_file(&dest_path).map_err(|e| {
                format!(
                    "Failed to remove target symlink '{}': {}",
                    dest_path.display(),
                    e
                )
            })?;
        } else {
            return Err(format!(
                "Skill '{}' already exists in {}",
                skill_name, target_agent
            ));
        }
    }

    // If the source in SharedSkills is itself a symlink, remove it and copy
    // the resolved content to the destination (making it a true local copy).
    if shared_skill_path.is_symlink() {
        // Copy resolved content to destination
        if resolved_source.is_dir() {
            copy_dir_recursive(&resolved_source, &dest_path)
                .map_err(|e| format!("Failed to copy shared skill to {}: {}", target_agent, e))?;
        } else {
            fs::copy(&resolved_source, &dest_path)
                .map_err(|e| format!("Failed to copy shared skill to {}: {}", target_agent, e))?;
        }
        // Remove the symlink from shared library
        fs::remove_file(shared_skill_path).map_err(|e| {
            format!(
                "Failed to remove shared symlink '{}': {}",
                shared_skill_path.display(),
                e
            )
        })?;
    } else {
        // Source is a real directory — move it
        if let Err(rename_err) = fs::rename(shared_skill_path, &dest_path) {
            copy_dir_recursive(shared_skill_path, &dest_path).map_err(|copy_err| {
                format!(
                    "Failed to move shared skill: {}; fallback copy failed: {}",
                    rename_err, copy_err
                )
            })?;
            fs::remove_dir_all(shared_skill_path)
                .map_err(|e| format!("Failed to remove shared source after copy: {}", e))?;
        }
    }

    for linked_path in linked_paths {
        let linked = Path::new(&linked_path);
        if linked == dest_path {
            continue;
        }

        if linked.is_symlink() {
            fs::remove_file(linked).map_err(|e| {
                format!(
                    "Failed to remove linked symlink '{}': {}",
                    linked.display(),
                    e
                )
            })?;
        }
    }

    remove_empty_shared_parent_dir(shared_skill_path, &shared_root);

    Ok(format!(
        "Moved '{}' from Shared Library to {} as local",
        skill_name, target_agent
    ))
}

/// Install a skill to a target agent using the shared-library policy.
pub fn install_skill(source_path: &str, target_agent: &str) -> Result<String, String> {
    let configs = get_agent_configs();
    let target = configs
        .iter()
        .find(|c| c.name == target_agent)
        .ok_or_else(|| format!("Unknown agent: {}", target_agent))?;

    let source = Path::new(source_path);
    let skill_name = source
        .file_name()
        .ok_or("Invalid source path")?
        .to_string_lossy()
        .to_string();

    if target.name == "Shared Library" {
        let app_settings = settings::load_settings().unwrap_or_default();
        let (category, confidence, reason, model) =
            resolve_shared_library_install_category(source_path, source, &app_settings);
        let shared_skill_path =
            ensure_skill_in_shared_library(source, &skill_name, Some(&category))?;
        write_category_assignment(
            &shared_skill_path,
            CategoryAssignmentMode::Auto,
            &category,
            confidence,
            reason,
            model,
        )?;
        let sync = sync_shared_skill_to_agents(
            &shared_skill_path,
            &skill_name,
            None,
            LocalConflictStrategy::Skip,
        )?;
        return Ok(format_shared_sync_message(&skill_name, &sync));
    }

    if !target.skills_path.exists() {
        fs::create_dir_all(&target.skills_path)
            .map_err(|e| format!("Failed to create target dir: {}", e))?;
    }

    let dest = target.skills_path.join(&skill_name);
    if dest.exists() || dest.is_symlink() {
        return Err(format!(
            "Skill '{}' already exists in {}",
            skill_name, target_agent
        ));
    }

    let resolved_source = fs::canonicalize(source).unwrap_or_else(|_| source.to_path_buf());
    let shared_root = get_shared_library_root()?;

    if is_path_in_shared_library(&resolved_source, &shared_root) {
        let sync = sync_shared_skill_to_agents(
            &resolved_source,
            &skill_name,
            Some(target_agent),
            LocalConflictStrategy::Skip,
        )?;
        if !sync.skipped_conflicts.is_empty() {
            return Err(format!(
                "Skill '{}' conflicts with existing content in {}",
                skill_name, target_agent
            ));
        }
        if sync.linked == 0 {
            return Err(format!(
                "Skill '{}' is already linked in {}",
                skill_name, target_agent
            ));
        }
        return Ok(format!("Linked '{}' to {}", skill_name, target_agent));
    }

    copy_dir_recursive(&resolved_source, &dest).map_err(|e| format!("Failed to copy: {}", e))?;

    Ok(format!("Copied '{}' to {}", skill_name, target_agent))
}

pub fn move_shared_skill_to_category(
    skill_path: &str,
    category_slug: &str,
) -> Result<String, String> {
    move_shared_skill_to_category_with_assignment(
        skill_path,
        category_slug,
        CategoryAssignmentMode::Manual,
        None,
        None,
        None,
    )
}

fn move_shared_skill_to_category_with_assignment(
    skill_path: &str,
    category_slug: &str,
    mode: CategoryAssignmentMode,
    confidence: Option<f64>,
    reason: Option<String>,
    model: Option<String>,
) -> Result<String, String> {
    if !is_valid_shared_library_category_slug(category_slug) {
        return Err(format!(
            "Unknown shared library category: {}",
            category_slug
        ));
    }

    let shared_root = get_shared_library_root()?;
    let current_path = Path::new(skill_path);
    let canonical_current_path = fs::canonicalize(current_path).map_err(|error| {
        format!(
            "Failed to resolve shared skill '{}': {}",
            current_path.display(),
            error
        )
    })?;

    if !is_path_in_shared_library(&canonical_current_path, &shared_root) {
        return Err(format!(
            "Skill '{}' is not stored in Shared Library",
            skill_path
        ));
    }

    let skill_name = canonical_current_path
        .file_name()
        .ok_or("Invalid shared skill path")?
        .to_string_lossy()
        .to_string();
    let target_dir = shared_root.join(category_slug);
    let dest_path = target_dir.join(&skill_name);

    fs::create_dir_all(&target_dir)
        .map_err(|error| format!("Failed to create shared category dir: {}", error))?;

    let final_path = if dest_path == canonical_current_path {
        canonical_current_path.clone()
    } else {
        if dest_path.exists() || dest_path.is_symlink() {
            return Err(format!(
                "Skill '{}' already exists in Shared Library category '{}'",
                skill_name, category_slug
            ));
        }

        if let Err(rename_err) = fs::rename(&canonical_current_path, &dest_path) {
            copy_dir_recursive(&canonical_current_path, &dest_path).map_err(|copy_err| {
                format!(
                    "Failed to move shared skill: {}; fallback copy failed: {}",
                    rename_err, copy_err
                )
            })?;
            fs::remove_dir_all(&canonical_current_path).map_err(|error| {
                format!("Failed to remove old shared source after copy: {}", error)
            })?;
        }

        remove_empty_shared_parent_dir(&canonical_current_path, &shared_root);
        dest_path
    };

    write_category_assignment(&final_path, mode, category_slug, confidence, reason, model)?;
    sync_shared_skill_to_agents(
        &final_path,
        &skill_name,
        None,
        LocalConflictStrategy::BackupAndReplace,
    )?;

    Ok(format!(
        "Moved '{}' to Shared Library/{}",
        skill_name, category_slug
    ))
}

pub fn install_skill_to_shared_category(
    source_path: &str,
    category_slug: &str,
) -> Result<String, String> {
    if !is_valid_shared_library_category_slug(category_slug) {
        return Err(format!(
            "Unknown shared library category: {}",
            category_slug
        ));
    }

    let source = Path::new(source_path);
    let skill_name = source
        .file_name()
        .ok_or("Invalid source path")?
        .to_string_lossy()
        .to_string();
    let shared_root = get_shared_library_root()?;

    if is_path_in_bin(source)? {
        return restore_bin_skill_to_shared_category_with_assignment(
            source_path,
            category_slug,
            CategoryAssignmentMode::Manual,
            None,
            None,
            None,
        );
    }

    let canonical_source = fs::canonicalize(source).unwrap_or_else(|_| source.to_path_buf());

    if is_path_in_shared_library(&canonical_source, &shared_root) {
        return move_shared_skill_to_category(source_path, category_slug);
    }

    let shared_skill_path =
        ensure_skill_in_shared_library(source, &skill_name, Some(category_slug))?;
    write_category_assignment(
        &shared_skill_path,
        CategoryAssignmentMode::Manual,
        category_slug,
        None,
        None,
        None,
    )?;
    let sync = sync_shared_skill_to_agents(
        &shared_skill_path,
        &skill_name,
        None,
        LocalConflictStrategy::Skip,
    )?;

    Ok(format_shared_sync_message(&skill_name, &sync))
}

pub fn auto_categorize_shared_skills(skill_paths: Vec<String>) -> Result<String, String> {
    let settings = settings::load_settings()?;
    if !settings.categorization_enabled {
        return Err(String::from("Categorization is disabled in Settings"));
    }

    let shared_root = get_shared_library_root()?;
    let mut recategorized = 0;
    let mut unchanged = 0;
    let mut skipped_manual = 0;
    let mut failed = 0;

    for skill_path in skill_paths {
        let skill_dir = PathBuf::from(&skill_path);
        let canonical_path = match fs::canonicalize(&skill_dir) {
            Ok(path) => path,
            Err(_) => {
                failed += 1;
                continue;
            }
        };

        if !is_path_in_shared_library(&canonical_path, &shared_root) || canonical_path.is_symlink()
        {
            failed += 1;
            continue;
        }

        let metadata = read_skill_gate_metadata(&canonical_path);
        if metadata
            .category_assignment
            .as_ref()
            .and_then(|assignment| assignment.mode.clone())
            == Some(CategoryAssignmentMode::Manual)
        {
            skipped_manual += 1;
            continue;
        }

        let classification =
            match categorizer::categorize_skill_directory(&canonical_path, &settings) {
                Ok(result) => result,
                Err(_) => {
                    failed += 1;
                    continue;
                }
            };

        let target_slug = if is_valid_shared_library_category_slug(&classification.category_slug) {
            classification.category_slug
        } else {
            String::from("uncategorized")
        };
        let current_slug = resolve_shared_category_from_path(&canonical_path, &shared_root);

        if current_slug == target_slug {
            if write_category_assignment(
                &canonical_path,
                CategoryAssignmentMode::Auto,
                &target_slug,
                classification.confidence,
                classification.reason,
                Some(settings.categorization_model.clone()),
            )
            .is_err()
            {
                failed += 1;
                continue;
            }
            unchanged += 1;
            continue;
        }

        if move_shared_skill_to_category_with_assignment(
            canonical_path.to_string_lossy().as_ref(),
            &target_slug,
            CategoryAssignmentMode::Auto,
            classification.confidence,
            classification.reason,
            Some(settings.categorization_model.clone()),
        )
        .is_ok()
        {
            recategorized += 1;
        } else {
            failed += 1;
        }
    }

    Ok(format!(
        "Auto-categorized {} skills, {} unchanged, {} manual skipped, {} failed",
        recategorized, unchanged, skipped_manual, failed
    ))
}

pub fn reconcile_shared_library_targets() -> Result<String, String> {
    let shared_skills = scan_all_skills_raw()
        .into_iter()
        .filter(|skill| skill.agent == "Shared Library")
        .map(|skill| {
            let path = PathBuf::from(skill.path);
            let skill_name = path
                .file_name()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string();
            (path, skill_name)
        })
        .collect::<Vec<_>>();
    let mut summary = SharedSyncSummary::default();

    for (shared_skill_path, skill_name) in shared_skills {
        let next = sync_shared_skill_to_agents(
            &shared_skill_path,
            &skill_name,
            None,
            LocalConflictStrategy::BackupAndReplace,
        )?;
        merge_shared_sync_summary(&mut summary, next);
    }

    let mut parts = vec![format!("linked {} agents", summary.linked)];
    if summary.already_linked > 0 {
        parts.push(format!("{} already linked", summary.already_linked));
    }
    if summary.backed_up_conflicts > 0 {
        parts.push(format!(
            "backed up {} conflicts",
            summary.backed_up_conflicts
        ));
    }
    if !summary.skipped_conflicts.is_empty() {
        parts.push(format!(
            "skipped conflicts in {}",
            summary.skipped_conflicts.join(", ")
        ));
    }

    Ok(format!(
        "Reconciled Shared Library and {}",
        parts.join(", ")
    ))
}

fn create_directory_symlink(target: &Path, link_path: &Path) -> Result<(), String> {
    #[cfg(unix)]
    std::os::unix::fs::symlink(target, link_path)
        .map_err(|e| format!("Failed to create symlink: {}", e))?;

    #[cfg(windows)]
    std::os::windows::fs::symlink_dir(target, link_path)
        .map_err(|e| format!("Failed to create symlink: {}", e))?;

    Ok(())
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

fn unique_bin_skill_path(bin_root: &Path, skill_name: &str) -> PathBuf {
    let direct = bin_root.join(skill_name);
    if !direct.exists() && !direct.is_symlink() {
        return direct;
    }

    for attempt in 1..1000 {
        let candidate = bin_root.join(format!("{}-{}", skill_name, attempt));
        if !candidate.exists() && !candidate.is_symlink() {
            return candidate;
        }
    }

    bin_root.join(format!("{}-bin", skill_name))
}

fn move_path_to_destination(source: &Path, dest: &Path) -> Result<(), String> {
    if source.is_symlink() {
        let target = fs::canonicalize(source).map_err(|error| {
            format!(
                "Failed to resolve symlink target '{}': {}",
                source.display(),
                error
            )
        })?;
        create_directory_symlink(&target, dest)?;
        fs::remove_file(source).map_err(|error| {
            format!("Failed to remove symlink '{}': {}", source.display(), error)
        })?;
        return Ok(());
    }

    if !source.is_dir() {
        return Err(format!(
            "Skill path is not a directory: {}",
            source.display()
        ));
    }

    if fs::rename(source, dest).is_ok() {
        return Ok(());
    }

    copy_dir_recursive(source, dest)
        .map_err(|error| format!("Failed to copy skill into Bin: {}", error))?;
    fs::remove_dir_all(source)
        .map_err(|error| format!("Failed to remove original skill after bin move: {}", error))?;

    Ok(())
}

fn is_path_inside_root(path: &Path, root: &Path) -> bool {
    let raw_path = if path.is_absolute() {
        path.to_path_buf()
    } else {
        std::env::current_dir()
            .map(|current_dir| current_dir.join(path))
            .unwrap_or_else(|_| path.to_path_buf())
    };

    if raw_path.starts_with(root) {
        return true;
    }

    let canonical_path = fs::canonicalize(path).unwrap_or_else(|_| raw_path.clone());
    let canonical_root = fs::canonicalize(root).unwrap_or_else(|_| root.to_path_buf());
    canonical_path.starts_with(canonical_root)
}

fn is_path_in_bin(path: &Path) -> Result<bool, String> {
    let bin_root = get_bin_root()?;
    Ok(is_path_inside_root(path, &bin_root))
}

fn restore_bin_skill_to_agent(source_path: &str, target_agent: &str) -> Result<String, String> {
    let source = Path::new(source_path);
    if !source.exists() && !source.is_symlink() {
        return Err(format!("Path does not exist: {}", source_path));
    }

    if !is_path_in_bin(source)? {
        return Err(format!("Skill '{}' is not stored in Bin", source_path));
    }

    let configs = get_agent_configs();
    let target = configs
        .iter()
        .find(|config| config.name == target_agent)
        .ok_or_else(|| format!("Unknown agent: {}", target_agent))?;

    let skill_name = source
        .file_name()
        .ok_or("Invalid source path")?
        .to_string_lossy()
        .to_string();
    fs::create_dir_all(&target.skills_path)
        .map_err(|error| format!("Failed to create target dir: {}", error))?;
    let dest = target.skills_path.join(&skill_name);
    if dest.exists() || dest.is_symlink() {
        return Err(format!(
            "Skill '{}' already exists in {}",
            skill_name, target_agent
        ));
    }

    move_path_to_destination(source, &dest)?;

    Ok(format!("Restored '{}' to {}", skill_name, target_agent))
}

fn restore_bin_skill_to_shared_library(source_path: &str) -> Result<String, String> {
    let source = Path::new(source_path);
    let app_settings = settings::load_settings().unwrap_or_default();
    let (category, confidence, reason, model) =
        resolve_shared_library_install_category(source_path, source, &app_settings);

    restore_bin_skill_to_shared_category_with_assignment(
        source_path,
        &category,
        CategoryAssignmentMode::Auto,
        confidence,
        reason,
        model,
    )
}

fn restore_bin_skill_to_shared_category_with_assignment(
    source_path: &str,
    category_slug: &str,
    mode: CategoryAssignmentMode,
    confidence: Option<f64>,
    reason: Option<String>,
    model: Option<String>,
) -> Result<String, String> {
    if !is_valid_shared_library_category_slug(category_slug) {
        return Err(format!(
            "Unknown shared library category: {}",
            category_slug
        ));
    }

    let source = Path::new(source_path);
    if !source.exists() && !source.is_symlink() {
        return Err(format!("Path does not exist: {}", source_path));
    }

    if !is_path_in_bin(source)? {
        return Err(format!("Skill '{}' is not stored in Bin", source_path));
    }

    let skill_name = source
        .file_name()
        .ok_or("Invalid source path")?
        .to_string_lossy()
        .to_string();
    let shared_root = get_shared_library_root()?;
    let target_dir = shared_root.join(category_slug);
    let dest = target_dir.join(&skill_name);

    fs::create_dir_all(&target_dir)
        .map_err(|error| format!("Failed to create shared category dir: {}", error))?;

    let final_path = if source.is_symlink() {
        let canonical_source = fs::canonicalize(source).map_err(|error| {
            format!(
                "Failed to resolve Bin symlink '{}': {}",
                source.display(),
                error
            )
        })?;

        if is_path_in_shared_library(&canonical_source, &shared_root) {
            let result = move_shared_skill_to_category_with_assignment(
                canonical_source.to_string_lossy().as_ref(),
                category_slug,
                mode,
                confidence,
                reason,
                model,
            )?;
            fs::remove_file(source).map_err(|error| {
                format!("Failed to remove Bin symlink '{}': {}", source.display(), error)
            })?;
            return Ok(format!("Restored via Bin: {}", result));
        }

        if dest.exists() || dest.is_symlink() {
            return Err(format!(
                "Skill '{}' already exists in Shared Library category '{}'",
                skill_name, category_slug
            ));
        }

        copy_dir_recursive(&canonical_source, &dest)
            .map_err(|error| format!("Failed to copy Bin symlink target: {}", error))?;
        fs::remove_file(source).map_err(|error| {
            format!("Failed to remove Bin symlink '{}': {}", source.display(), error)
        })?;
        dest
    } else {
        if dest.exists() || dest.is_symlink() {
            return Err(format!(
                "Skill '{}' already exists in Shared Library category '{}'",
                skill_name, category_slug
            ));
        }

        move_path_to_destination(source, &dest)?;
        dest
    };

    write_skill_gate_metadata(
        &final_path,
        &SkillGateMetadata {
            category_assignment: Some(CategoryAssignment {
                mode: Some(mode),
                slug: Some(category_slug.to_string()),
                confidence,
                classified_at: None,
                reason,
                model,
            }),
        },
    )?;
    let sync = sync_shared_skill_to_agents(
        &final_path,
        &skill_name,
        None,
        LocalConflictStrategy::Skip,
    )?;

    Ok(format_shared_sync_message(&skill_name, &sync))
}

fn remove_linked_agent_symlinks(canonical_path: &str, source_path: &str) -> Result<usize, String> {
    let linked_paths = scan_all_skills_raw()
        .into_iter()
        .filter(|skill| {
            skill.agent != "Shared Library"
                && skill.agent != BIN_AGENT_NAME
                && skill.is_symlink
                && skill.canonical_path == canonical_path
                && skill.path != source_path
        })
        .map(|skill| skill.path)
        .collect::<Vec<_>>();

    for linked_path in &linked_paths {
        let linked = Path::new(linked_path);
        if linked.is_symlink() {
            fs::remove_file(linked).map_err(|error| {
                format!(
                    "Failed to remove linked symlink '{}': {}",
                    linked.display(),
                    error
                )
            })?;
        }
    }

    Ok(linked_paths.len())
}

/// Move a skill out of an agent into the app Bin.
pub fn move_skill_to_bin(skill_path: &str) -> Result<String, String> {
    let path = Path::new(skill_path);

    if !path.exists() && !path.is_symlink() {
        return Err(format!("Path does not exist: {}", skill_path));
    }

    let skill_name = path
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();
    let bin_root = get_bin_root()?;
    fs::create_dir_all(&bin_root)
        .map_err(|error| format!("Failed to create Bin folder: {}", error))?;
    let dest = unique_bin_skill_path(&bin_root, &skill_name);

    let shared_root = get_shared_library_root()?;
    let raw_abs = if path.is_absolute() {
        path.to_path_buf()
    } else {
        std::env::current_dir()
            .map_err(|error| format!("Failed to resolve current directory: {}", error))?
            .join(path)
    };
    let is_shared_source = is_path_in_shared_library(&raw_abs, &shared_root);
    let canonical_path = fs::canonicalize(path).unwrap_or_else(|_| path.to_path_buf());
    let canonical_string = canonical_path.to_string_lossy().to_string();
    let removed_links = if is_shared_source {
        remove_linked_agent_symlinks(&canonical_string, skill_path)?
    } else {
        0
    };

    move_path_to_destination(path, &dest)?;

    if is_shared_source {
        remove_empty_shared_parent_dir(path, &shared_root);
    }

    if removed_links > 0 {
        Ok(format!(
            "Moved '{}' to Bin and removed {} linked agent symlinks",
            skill_name, removed_links
        ))
    } else {
        Ok(format!("Moved '{}' to Bin", skill_name))
    }
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
        fs::remove_file(path).map_err(|e| format!("Failed to remove symlink: {}", e))?;
        Ok(format!("Removed symlink '{}'", skill_name))
    } else {
        let shared_root = get_shared_library_root()?;
        let canonical_path = fs::canonicalize(path).unwrap_or_else(|_| path.to_path_buf());
        let linked_paths = if is_path_in_shared_library(path, &shared_root) {
            let canonical_string = canonical_path.to_string_lossy().to_string();
            scan_all_skills_raw()
                .into_iter()
                .filter(|skill| {
                    skill.is_symlink
                        && skill.canonical_path == canonical_string
                        && skill.path != skill_path
                })
                .map(|skill| skill.path)
                .collect::<Vec<_>>()
        } else {
            Vec::new()
        };

        for linked_path in &linked_paths {
            let linked = Path::new(linked_path);
            if linked.is_symlink() {
                fs::remove_file(linked).map_err(|e| {
                    format!(
                        "Failed to remove linked symlink '{}': {}",
                        linked.display(),
                        e
                    )
                })?;
            }
        }

        // Physical directory — remove recursively
        fs::remove_dir_all(path).map_err(|e| format!("Failed to remove directory: {}", e))?;

        if linked_paths.is_empty() {
            Ok(format!("Removed '{}' and all contents", skill_name))
        } else {
            Ok(format!(
                "Removed '{}' and {} linked agent symlinks",
                skill_name,
                linked_paths.len()
            ))
        }
    }
}

/// Batch migrate skills
pub fn batch_migrate_skills(skills: Vec<SkillInfo>, target_agent: &str) -> Result<String, String> {
    let mut success_count = 0;
    let mut errors: Vec<String> = Vec::new();

    for skill in skills {
        let source_path = Path::new(&skill.path);
        if !source_path.exists() && !source_path.is_symlink() {
            errors.push(format!("'{}' not found", skill.name));
            continue;
        }

        let result = if skill.agent == BIN_AGENT_NAME {
            if target_agent == "Shared Library" {
                restore_bin_skill_to_shared_library(&skill.path)
            } else {
                restore_bin_skill_to_agent(&skill.path, target_agent)
            }
        } else if skill.agent == "Shared Library" && target_agent != "Shared Library" {
            move_shared_skill_to_agent_local(source_path, target_agent)
        } else {
            install_skill(&skill.path, target_agent)
        };

        match result {
            Ok(_) => success_count += 1,
            Err(e) => errors.push(format!("'{}': {}", skill.name, e)),
        }
    }

    if success_count > 0 && errors.is_empty() {
        Ok(format!("Migrated {} skills", success_count))
    } else if success_count > 0 {
        Ok(format!(
            "Migrated {} skills ({} failed: {})",
            success_count,
            errors.len(),
            errors.join("; ")
        ))
    } else if !errors.is_empty() {
        Err(format!("Migration failed: {}", errors.join("; ")))
    } else {
        Ok(String::from("No skills to migrate"))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::settings::{self, AppSettings};
    use std::sync::{Mutex, OnceLock};
    use std::time::{SystemTime, UNIX_EPOCH};

    static HOME_LOCK: OnceLock<Mutex<()>> = OnceLock::new();

    fn with_temp_home<T>(test: impl FnOnce(&Path) -> T) -> T {
        let _guard = HOME_LOCK
            .get_or_init(|| Mutex::new(()))
            .lock()
            .unwrap_or_else(|err| err.into_inner());
        let original_home = std::env::var_os("HOME");
        let temp_home = std::env::temp_dir().join(format!(
            "skill-gate-test-{}",
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));

        fs::create_dir_all(&temp_home).unwrap();
        std::env::set_var("HOME", &temp_home);

        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| test(&temp_home)));

        match original_home {
            Some(home) => std::env::set_var("HOME", home),
            None => std::env::remove_var("HOME"),
        }

        let _ = fs::remove_dir_all(&temp_home);

        match result {
            Ok(value) => value,
            Err(err) => std::panic::resume_unwind(err),
        }
    }

    fn create_skill(path: &Path) {
        fs::create_dir_all(path).unwrap();
        fs::write(
            path.join("SKILL.md"),
            "---\ndescription: test skill\n---\nbody",
        )
        .unwrap();
    }

    fn symlink_dir(src: &Path, dst: &Path) {
        #[cfg(unix)]
        std::os::unix::fs::symlink(src, dst).unwrap();

        #[cfg(windows)]
        std::os::windows::fs::symlink_dir(src, dst).unwrap();
    }

    fn test_skill(name: &str, path: &str, is_symlink: bool) -> SkillInfo {
        SkillInfo {
            name: String::from(name),
            description: String::new(),
            path: String::from(path),
            canonical_path: String::from(path),
            agent: String::from("Codex"),
            is_symlink,
            category: None,
            category_assignment_mode: None,
            category_confidence: None,
            category_classified_at: None,
            version: None,
            source: None,
        }
    }

    #[test]
    fn codex_target_points_to_user_skills_directory() {
        with_temp_home(|home| {
            let codex_target = get_agent_paths()
                .into_iter()
                .find(|target| target.name == "Codex")
                .expect("missing Codex target");

            assert_eq!(
                codex_target.path,
                home.join(".codex").join("skills").to_string_lossy()
            );
        });
    }

    #[test]
    fn cursor_target_points_to_user_skills_directory() {
        with_temp_home(|home| {
            let cursor_target = get_agent_paths()
                .into_iter()
                .find(|target| target.name == "Cursor")
                .expect("missing Cursor target");

            assert_eq!(
                cursor_target.path,
                home.join(".cursor").join("skills").to_string_lossy()
            );
        });
    }

    #[test]
    fn bin_target_points_to_app_config_bin_directory() {
        with_temp_home(|_home| {
            let bin_target = get_agent_paths()
                .into_iter()
                .find(|target| target.name == "Bin")
                .expect("missing Bin target");

            assert!(
                bin_target.path.ends_with("skill-gate/bin"),
                "Bin target should live in the Skill Gate app config folder"
            );
        });
    }

    #[test]
    fn bin_target_uses_configured_bin_directory() {
        with_temp_home(|home| {
            let custom_bin = home.join("CustomSkillBin");
            settings::save_settings(&AppSettings {
                bin_path: custom_bin.to_string_lossy().to_string(),
                ..AppSettings::default()
            })
            .unwrap();

            let bin_target = get_agent_paths()
                .into_iter()
                .find(|target| target.name == "Bin")
                .expect("missing Bin target");

            assert_eq!(bin_target.path, custom_bin.to_string_lossy());
        });
    }

    #[test]
    fn moving_skill_to_bin_uses_configured_bin_directory() {
        with_temp_home(|home| {
            let custom_bin = home.join("CustomSkillBin");
            settings::save_settings(&AppSettings {
                bin_path: custom_bin.to_string_lossy().to_string(),
                ..AppSettings::default()
            })
            .unwrap();

            let codex_dir = home.join(".codex").join("skills");
            fs::create_dir_all(&codex_dir).unwrap();

            let skill_path = codex_dir.join("move-to-custom-bin");
            create_skill(&skill_path);

            move_skill_to_bin(skill_path.to_string_lossy().as_ref()).unwrap();

            assert!(
                custom_bin.join("move-to-custom-bin").exists(),
                "moved skill should land in the configured Bin folder"
            );
        });
    }

    #[test]
    fn moving_local_skill_to_bin_removes_original_and_scans_bin() {
        with_temp_home(|home| {
            let codex_dir = home.join(".codex").join("skills");
            fs::create_dir_all(&codex_dir).unwrap();

            let skill_path = codex_dir.join("remove-me");
            create_skill(&skill_path);

            move_skill_to_bin(skill_path.to_string_lossy().as_ref()).unwrap();

            assert!(!skill_path.exists(), "original skill should leave Codex");

            let bin_skill = scan_all_skills_raw()
                .into_iter()
                .find(|skill| skill.agent == "Bin" && skill.name == "remove-me")
                .expect("moved skill should be visible in Bin");

            assert!(Path::new(&bin_skill.path).exists());
            assert!(!bin_skill.is_symlink);
        });
    }

    #[test]
    fn moving_agent_symlink_to_bin_keeps_shared_source() {
        with_temp_home(|home| {
            let shared_dir = home.join("SharedSkills");
            let codex_dir = home.join(".codex").join("skills");
            fs::create_dir_all(&shared_dir).unwrap();
            fs::create_dir_all(&codex_dir).unwrap();

            let shared_skill = shared_dir.join("linked-skill");
            create_skill(&shared_skill);
            let codex_link = codex_dir.join("linked-skill");
            symlink_dir(&shared_skill, &codex_link);

            move_skill_to_bin(codex_link.to_string_lossy().as_ref()).unwrap();

            assert!(shared_skill.exists(), "shared source should remain");
            assert!(
                !codex_link.exists() && !codex_link.is_symlink(),
                "agent symlink should leave Codex"
            );

            let bin_skill = scan_all_skills_raw()
                .into_iter()
                .find(|skill| skill.agent == "Bin" && skill.name == "linked-skill")
                .expect("moved symlink should be visible in Bin");

            assert!(bin_skill.is_symlink);
            assert_eq!(
                bin_skill.canonical_path,
                fs::canonicalize(&shared_skill)
                    .unwrap()
                    .to_string_lossy()
                    .to_string()
            );
        });
    }

    #[test]
    fn moving_shared_skill_to_bin_removes_agent_symlinks() {
        with_temp_home(|home| {
            let shared_dir = home.join("SharedSkills");
            let claude_dir = home.join(".claude").join("skills");
            let codex_dir = home.join(".codex").join("skills");
            fs::create_dir_all(&shared_dir).unwrap();
            fs::create_dir_all(&claude_dir).unwrap();
            fs::create_dir_all(&codex_dir).unwrap();

            let shared_skill = shared_dir.join("shared-remove");
            create_skill(&shared_skill);
            let claude_link = claude_dir.join("shared-remove");
            let codex_link = codex_dir.join("shared-remove");
            symlink_dir(&shared_skill, &claude_link);
            symlink_dir(&shared_skill, &codex_link);

            move_skill_to_bin(shared_skill.to_string_lossy().as_ref()).unwrap();

            assert!(
                !shared_skill.exists(),
                "shared source should move out of Shared Library"
            );
            assert!(
                !claude_link.exists() && !claude_link.is_symlink(),
                "Claude symlink should be removed"
            );
            assert!(
                !codex_link.exists() && !codex_link.is_symlink(),
                "Codex symlink should be removed"
            );

            let bin_skill = scan_all_skills_raw()
                .into_iter()
                .find(|skill| skill.agent == "Bin" && skill.name == "shared-remove")
                .expect("shared skill should be visible in Bin");

            assert!(!bin_skill.is_symlink);
        });
    }

    #[test]
    fn restoring_bin_skill_to_agent_moves_out_of_bin() {
        with_temp_home(|home| {
            let bin_dir = home.join("SkillBin");
            settings::save_settings(&AppSettings {
                bin_path: bin_dir.to_string_lossy().to_string(),
                ..AppSettings::default()
            })
            .unwrap();

            let codex_dir = home.join(".codex").join("skills");
            fs::create_dir_all(&codex_dir).unwrap();
            fs::create_dir_all(&bin_dir).unwrap();

            let bin_skill = bin_dir.join("restore-me");
            create_skill(&bin_skill);

            batch_migrate_skills(
                vec![SkillInfo {
                    name: String::from("restore-me"),
                    description: String::new(),
                    path: bin_skill.to_string_lossy().to_string(),
                    canonical_path: bin_skill.to_string_lossy().to_string(),
                    agent: String::from(BIN_AGENT_NAME),
                    is_symlink: false,
                    category: None,
                    category_assignment_mode: None,
                    category_confidence: None,
                    category_classified_at: None,
                    version: None,
                    source: None,
                }],
                "Codex",
            )
            .unwrap();

            assert!(
                !bin_skill.exists(),
                "restored skill should be removed from Bin"
            );
            assert!(
                codex_dir.join("restore-me").exists(),
                "restored skill should move to the target agent"
            );
        });
    }

    #[test]
    fn restoring_bin_skill_to_shared_category_moves_out_of_bin() {
        with_temp_home(|home| {
            let bin_dir = home.join("SkillBin");
            let shared_dir = home.join("SharedSkills");
            settings::save_settings(&AppSettings {
                bin_path: bin_dir.to_string_lossy().to_string(),
                shared_library_path: shared_dir.to_string_lossy().to_string(),
                ..AppSettings::default()
            })
            .unwrap();

            fs::create_dir_all(&bin_dir).unwrap();
            let bin_skill = bin_dir.join("restore-shared");
            create_skill(&bin_skill);

            install_skill_to_shared_category(
                bin_skill.to_string_lossy().as_ref(),
                "data-analysis",
            )
            .unwrap();

            assert!(
                !bin_skill.exists(),
                "restored shared skill should be removed from Bin"
            );
            assert!(
                shared_dir.join("data-analysis").join("restore-shared").exists(),
                "restored skill should move into the target Shared Library category"
            );
        });
    }

    #[test]
    fn symlinked_skills_are_sorted_before_local_skills() {
        let mut skills = vec![
            test_skill("alpha-local", "/tmp/alpha-local", false),
            test_skill("zeta-link", "/tmp/zeta-link", true),
            test_skill("beta-link", "/tmp/beta-link", true),
            test_skill("delta-local", "/tmp/delta-local", false),
        ];

        sort_skills(&mut skills);

        let ordered: Vec<_> = skills
            .into_iter()
            .map(|skill| (skill.name, skill.is_symlink))
            .collect();

        assert_eq!(
            ordered,
            vec![
                (String::from("beta-link"), true),
                (String::from("zeta-link"), true),
                (String::from("alpha-local"), false),
                (String::from("delta-local"), false),
            ]
        );
    }

    #[test]
    fn migrating_symlinked_skill_to_shared_library_moves_the_real_directory() {
        with_temp_home(|home| {
            let shared_dir = home.join("SharedSkills");
            let claude_dir = home.join(".claude").join("skills");
            let antigravity_dir = home.join(".gemini").join("antigravity").join("skills");

            fs::create_dir_all(&shared_dir).unwrap();
            fs::create_dir_all(&claude_dir).unwrap();
            fs::create_dir_all(&antigravity_dir).unwrap();

            let canonical_skill = claude_dir.join("move-me");
            create_skill(&canonical_skill);

            let antigravity_link = antigravity_dir.join("move-me");
            symlink_dir(&canonical_skill, &antigravity_link);

            batch_migrate_skills(
                vec![SkillInfo {
                    name: String::from("move-me"),
                    description: String::new(),
                    path: antigravity_link.to_string_lossy().to_string(),
                    canonical_path: canonical_skill.to_string_lossy().to_string(),
                    agent: String::from("Antigravity"),
                    is_symlink: true,
                    category: None,
                    category_assignment_mode: None,
                    category_confidence: None,
                    category_classified_at: None,
                    version: None,
                    source: None,
                }],
                "Shared Library",
            )
            .unwrap();

            let shared_copy = shared_dir.join("uncategorized").join("move-me");
            assert!(shared_copy.exists(), "shared library copy should exist");
            assert!(
                !shared_copy.is_symlink(),
                "shared library should contain the real directory, not another symlink"
            );
            assert!(
                canonical_skill.is_symlink(),
                "original real directory should become a symlink back to the shared library"
            );
        });
    }

    #[test]
    fn installing_non_shared_skill_to_agent_copies_directory() {
        with_temp_home(|home| {
            let claude_dir = home.join(".claude").join("skills");
            let codex_dir = home.join(".codex").join("skills");

            fs::create_dir_all(&claude_dir).unwrap();
            fs::create_dir_all(&codex_dir).unwrap();

            let source_skill = claude_dir.join("copy-me");
            create_skill(&source_skill);

            install_skill(source_skill.to_string_lossy().as_ref(), "Codex").unwrap();

            let copied_skill = codex_dir.join("copy-me");
            assert!(copied_skill.exists(), "copied skill should exist in Codex");
            assert!(
                !copied_skill.is_symlink(),
                "non-shared installs should be copied, not symlinked"
            );
        });
    }

    #[test]
    fn moving_skill_to_shared_library_links_all_agents() {
        with_temp_home(|home| {
            let shared_dir = home.join("SharedSkills");
            let claude_dir = home.join(".claude").join("skills");
            let antigravity_dir = home.join(".gemini").join("antigravity").join("skills");
            let codex_dir = home.join(".codex").join("skills");

            fs::create_dir_all(&claude_dir).unwrap();
            fs::create_dir_all(&antigravity_dir).unwrap();
            fs::create_dir_all(&codex_dir).unwrap();

            let source_skill = claude_dir.join("share-me");
            create_skill(&source_skill);

            install_skill(source_skill.to_string_lossy().as_ref(), "Shared Library").unwrap();

            let shared_skill = shared_dir.join("uncategorized").join("share-me");
            assert!(shared_skill.exists(), "shared skill should exist");
            assert!(
                !shared_skill.is_symlink(),
                "shared skill should be real content"
            );

            for linked_path in [
                claude_dir.join("share-me"),
                antigravity_dir.join("share-me"),
                codex_dir.join("share-me"),
            ] {
                assert!(
                    linked_path.is_symlink(),
                    "expected {:?} to be a symlink after sharing",
                    linked_path
                );
                assert_eq!(
                    fs::canonicalize(&linked_path).unwrap(),
                    fs::canonicalize(&shared_skill).unwrap(),
                    "shared agent link should resolve to the shared library copy"
                );
            }
        });
    }

    #[test]
    fn scanning_repairs_missing_shared_library_links() {
        with_temp_home(|home| {
            let shared_dir = home.join("SharedSkills");
            let claude_dir = home.join(".claude").join("skills");
            let antigravity_dir = home.join(".gemini").join("antigravity").join("skills");
            let codex_dir = home.join(".codex").join("skills");

            fs::create_dir_all(&shared_dir).unwrap();
            fs::create_dir_all(&claude_dir).unwrap();
            fs::create_dir_all(&antigravity_dir).unwrap();
            fs::create_dir_all(&codex_dir).unwrap();

            let shared_skill = shared_dir.join("repair-me");
            create_skill(&shared_skill);

            let _ = scan_all_skills();

            for linked_path in [
                claude_dir.join("repair-me"),
                antigravity_dir.join("repair-me"),
                codex_dir.join("repair-me"),
            ] {
                assert!(
                    linked_path.is_symlink(),
                    "expected {:?} to be repaired into a symlink",
                    linked_path
                );
                assert_eq!(
                    fs::canonicalize(&linked_path).unwrap(),
                    fs::canonicalize(&shared_skill).unwrap(),
                    "repaired link should resolve to the shared library copy"
                );
            }
        });
    }

    #[test]
    fn scanning_relinks_stale_agent_symlinks_to_shared_library() {
        with_temp_home(|home| {
            let shared_dir = home.join("SharedSkills");
            let antigravity_dir = home.join(".gemini").join("antigravity").join("skills");
            let legacy_dir = home.join(".agents").join("skills");

            fs::create_dir_all(&shared_dir).unwrap();
            fs::create_dir_all(&antigravity_dir).unwrap();
            fs::create_dir_all(&legacy_dir).unwrap();

            let legacy_skill = legacy_dir.join("repair-me");
            create_skill(&legacy_skill);

            let shared_skill = shared_dir.join("repair-me");
            copy_dir_recursive(&legacy_skill, &shared_skill).unwrap();

            let stale_link = antigravity_dir.join("repair-me");
            symlink_dir(&legacy_skill, &stale_link);

            let _ = scan_all_skills();

            assert!(
                stale_link.is_symlink(),
                "stale Antigravity entry should still be a symlink after repair"
            );
            assert_eq!(
                fs::canonicalize(&stale_link).unwrap(),
                fs::canonicalize(&shared_skill).unwrap(),
                "stale Antigravity link should be repointed to Shared Library"
            );
        });
    }

    #[test]
    fn normalizing_relinks_shared_copy_back_to_external_source() {
        with_temp_home(|home| {
            let shared_dir = home.join("SharedSkills");
            let antigravity_dir = home.join(".gemini").join("antigravity").join("skills");
            let external_dir = home.join(".agents").join("skills");

            fs::create_dir_all(&shared_dir).unwrap();
            fs::create_dir_all(&antigravity_dir).unwrap();
            fs::create_dir_all(&external_dir).unwrap();

            let external_skill = external_dir.join("drive-skill");
            create_skill(&external_skill);

            let shared_copy = shared_dir.join("drive-skill");
            copy_dir_recursive(&external_skill, &shared_copy).unwrap();

            let antigravity_link = antigravity_dir.join("drive-skill");
            symlink_dir(&external_skill, &antigravity_link);

            normalize_legacy_agent_symlinks().unwrap();

            assert!(
                shared_copy.is_symlink(),
                "shared copy should be relinked back to the external source"
            );
            assert_eq!(
                fs::canonicalize(&shared_copy).unwrap(),
                fs::canonicalize(&external_skill).unwrap(),
                "shared library entry should resolve to the external source"
            );
            assert!(
                antigravity_link.is_symlink(),
                "agent symlink should stay a symlink for shared external sources"
            );
            assert_eq!(
                fs::canonicalize(&antigravity_link).unwrap(),
                fs::canonicalize(&external_skill).unwrap(),
                "agent symlink should keep pointing at the external source"
            );
        });
    }

    #[test]
    fn reconciling_shared_library_targets_backs_up_local_conflicts_and_links_agents() {
        with_temp_home(|home| {
            let shared_dir = home.join("SharedSkills");
            let antigravity_dir = home.join(".gemini").join("antigravity").join("skills");

            fs::create_dir_all(&shared_dir).unwrap();
            fs::create_dir_all(&antigravity_dir).unwrap();

            let shared_skill = shared_dir.join("react-best-practices");
            create_skill(&shared_skill);
            fs::write(
                shared_skill.join("SKILL.md"),
                "---\nname: vercel-react-best-practices\nsource: https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices\n---\nbody",
            )
            .unwrap();

            let antigravity_local = antigravity_dir.join("react-best-practices");
            create_skill(&antigravity_local);
            fs::write(
                antigravity_local.join("SKILL.md"),
                "---\nname: react-best-practices\nsource: community\n---\nbody",
            )
            .unwrap();

            let result = reconcile_shared_library_targets().unwrap();

            assert!(
                antigravity_local.is_symlink(),
                "agent local conflict should be replaced with a shared symlink"
            );
            assert_eq!(
                fs::canonicalize(&antigravity_local).unwrap(),
                fs::canonicalize(&shared_skill).unwrap(),
                "agent link should resolve to the shared library skill"
            );

            let backups = fs::read_dir(&antigravity_dir)
                .unwrap()
                .flatten()
                .map(|entry| entry.file_name().to_string_lossy().to_string())
                .filter(|name| name.starts_with("react-best-practices.skill-gate-local-backup"))
                .collect::<Vec<_>>();

            assert_eq!(
                backups.len(),
                1,
                "expected one backup of the local conflict"
            );
            assert!(
                result.contains("backed up 1 conflicts"),
                "summary should mention the backup operation"
            );
        });
    }

    #[test]
    fn scanning_uses_configured_shared_library_path_and_replaces_antigravity_conflicts() {
        with_temp_home(|home| {
            let shared_dir = home.join("Mounted Skill Library");
            let antigravity_dir = home.join(".gemini").join("antigravity").join("skills");

            fs::create_dir_all(&shared_dir).unwrap();
            fs::create_dir_all(&antigravity_dir).unwrap();

            settings::save_settings(&AppSettings {
                shared_library_path: shared_dir.to_string_lossy().to_string(),
                ..AppSettings::default()
            })
            .unwrap();

            let shared_target = get_agent_paths()
                .into_iter()
                .find(|target| target.name == "Shared Library")
                .expect("missing Shared Library target");
            assert_eq!(
                shared_target.path,
                shared_dir.to_string_lossy(),
                "scanner should use the configured shared library path instead of the default"
            );

            let shared_skill = shared_dir.join("react-best-practices");
            create_skill(&shared_skill);
            fs::write(
                shared_skill.join("SKILL.md"),
                "---\nname: vercel-react-best-practices\nsource: https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices\n---\nbody",
            )
            .unwrap();

            let antigravity_local = antigravity_dir.join("react-best-practices");
            create_skill(&antigravity_local);
            fs::write(
                antigravity_local.join("SKILL.md"),
                "---\nname: react-best-practices\nsource: community\n---\nbody",
            )
            .unwrap();

            let scanned = scan_all_skills();

            assert!(
                antigravity_local.is_symlink(),
                "scan should replace the conflicting Antigravity local copy with a shared symlink"
            );
            assert!(
                shared_skill.exists(),
                "shared skill should remain in the configured shared library after scan"
            );
            assert_eq!(
                fs::read_link(&antigravity_local).unwrap(),
                shared_skill,
                "Antigravity conflict should be repointed to the configured shared library"
            );

            let antigravity_skill = scanned
                .into_iter()
                .find(|skill| {
                    skill.agent == "Antigravity"
                        && skill.path == antigravity_local.to_string_lossy()
                })
                .expect("missing scanned Antigravity skill");
            assert!(
                antigravity_skill.is_symlink,
                "scanned Antigravity skill should be marked as a symlink after repair"
            );

            let backups = fs::read_dir(&antigravity_dir)
                .unwrap()
                .flatten()
                .map(|entry| entry.file_name().to_string_lossy().to_string())
                .filter(|name| name.starts_with("react-best-practices.skill-gate-local-backup"))
                .collect::<Vec<_>>();

            assert_eq!(
                backups.len(),
                1,
                "expected one backup of the local conflict"
            );
        });
    }

    #[test]
    fn migrating_shared_skill_to_agent_makes_target_local_and_removes_shared_links() {
        with_temp_home(|home| {
            let shared_dir = home.join("SharedSkills");
            let claude_dir = home.join(".claude").join("skills");
            let antigravity_dir = home.join(".gemini").join("antigravity").join("skills");
            let codex_dir = home.join(".codex").join("skills");
            let cursor_dir = home.join(".cursor").join("skills");

            fs::create_dir_all(&shared_dir).unwrap();
            fs::create_dir_all(&claude_dir).unwrap();
            fs::create_dir_all(&antigravity_dir).unwrap();
            fs::create_dir_all(&codex_dir).unwrap();
            fs::create_dir_all(&cursor_dir).unwrap();

            let shared_skill = shared_dir.join("detach-me");
            create_skill(&shared_skill);

            symlink_dir(&shared_skill, &claude_dir.join("detach-me"));
            symlink_dir(&shared_skill, &antigravity_dir.join("detach-me"));
            symlink_dir(&shared_skill, &codex_dir.join("detach-me"));
            symlink_dir(&shared_skill, &cursor_dir.join("detach-me"));

            batch_migrate_skills(
                vec![SkillInfo {
                    name: String::from("detach-me"),
                    description: String::new(),
                    path: shared_skill.to_string_lossy().to_string(),
                    canonical_path: shared_skill.to_string_lossy().to_string(),
                    agent: String::from("Shared Library"),
                    is_symlink: false,
                    category: None,
                    category_assignment_mode: None,
                    category_confidence: None,
                    category_classified_at: None,
                    version: None,
                    source: None,
                }],
                "Codex",
            )
            .unwrap();

            let codex_local = codex_dir.join("detach-me");
            assert!(
                codex_local.exists() && !codex_local.is_symlink(),
                "target agent should keep a local copy"
            );
            assert!(
                !shared_skill.exists(),
                "shared library source should be removed after detaching"
            );
            assert!(
                !claude_dir.join("detach-me").exists()
                    && !claude_dir.join("detach-me").is_symlink(),
                "Claude symlink should be removed"
            );
            assert!(
                !antigravity_dir.join("detach-me").exists()
                    && !antigravity_dir.join("detach-me").is_symlink(),
                "Antigravity symlink should be removed"
            );
            assert!(
                !cursor_dir.join("detach-me").exists()
                    && !cursor_dir.join("detach-me").is_symlink(),
                "Cursor symlink should be removed"
            );
        });
    }

    #[test]
    fn uninstalling_shared_skill_removes_agent_symlinks() {
        with_temp_home(|home| {
            let shared_dir = home.join("SharedSkills");
            let claude_dir = home.join(".claude").join("skills");
            let antigravity_dir = home.join(".gemini").join("antigravity").join("skills");
            let codex_dir = home.join(".codex").join("skills");
            let cursor_dir = home.join(".cursor").join("skills");

            fs::create_dir_all(&shared_dir).unwrap();
            fs::create_dir_all(&claude_dir).unwrap();
            fs::create_dir_all(&antigravity_dir).unwrap();
            fs::create_dir_all(&codex_dir).unwrap();
            fs::create_dir_all(&cursor_dir).unwrap();

            let shared_skill = shared_dir.join("remove-me");
            create_skill(&shared_skill);

            symlink_dir(&shared_skill, &claude_dir.join("remove-me"));
            symlink_dir(&shared_skill, &antigravity_dir.join("remove-me"));
            symlink_dir(&shared_skill, &codex_dir.join("remove-me"));
            symlink_dir(&shared_skill, &cursor_dir.join("remove-me"));

            uninstall_skill(shared_skill.to_string_lossy().as_ref()).unwrap();

            assert!(!shared_skill.exists(), "shared skill should be removed");
            assert!(
                !claude_dir.join("remove-me").exists()
                    && !claude_dir.join("remove-me").is_symlink(),
                "Claude link should be removed"
            );
            assert!(
                !antigravity_dir.join("remove-me").exists()
                    && !antigravity_dir.join("remove-me").is_symlink(),
                "Antigravity link should be removed"
            );
            assert!(
                !codex_dir.join("remove-me").exists() && !codex_dir.join("remove-me").is_symlink(),
                "Codex link should be removed"
            );
            assert!(
                !cursor_dir.join("remove-me").exists()
                    && !cursor_dir.join("remove-me").is_symlink(),
                "Cursor link should be removed"
            );
        });
    }

    #[test]
    fn scanning_migrates_non_shared_symlinked_skills_to_local_copies() {
        with_temp_home(|home| {
            let shared_dir = home.join("SharedSkills");
            let claude_dir = home.join(".claude").join("skills");
            let external_dir = home.join(".agents").join("skills");

            fs::create_dir_all(&shared_dir).unwrap();
            fs::create_dir_all(&claude_dir).unwrap();
            fs::create_dir_all(&external_dir).unwrap();

            let external_skill = external_dir.join("legacy-link");
            create_skill(&external_skill);

            let claude_link = claude_dir.join("legacy-link");
            symlink_dir(&external_skill, &claude_link);

            normalize_legacy_agent_symlinks().unwrap();
            let skills = scan_all_skills();
            let claude_skill = skills
                .iter()
                .find(|skill| skill.agent == "Claude Code" && skill.name == "legacy-link")
                .expect("expected Claude skill after scan");

            assert!(
                !claude_link.is_symlink(),
                "legacy non-shared symlink should be replaced with a real directory"
            );
            assert!(
                claude_link.join("SKILL.md").exists(),
                "migrated local copy should contain the copied skill files"
            );
            assert!(
                !claude_skill.is_symlink,
                "scanner should report migrated legacy skill as local"
            );
        });
    }

    #[test]
    fn metadata_parser_extracts_version_and_source() {
        let metadata = parse_skill_frontmatter(
            r#"---
name: demo-skill
description: "A demo skill"
version: 1.2.3
source: "https://github.com/example/skills/tree/main/demo-skill"
---

body"#,
        );

        assert_eq!(metadata.name.as_deref(), Some("demo-skill"));
        assert_eq!(metadata.description.as_deref(), Some("A demo skill"));
        assert_eq!(metadata.version.as_deref(), Some("1.2.3"));
        assert_eq!(
            metadata.source.as_deref(),
            Some("https://github.com/example/skills/tree/main/demo-skill")
        );
    }

    #[test]
    fn metadata_parser_extracts_folded_block_description() {
        let metadata = parse_skill_frontmatter(
            r#"---
name: demo-skill
description: >
  WWT design system, brand rules, and component patterns.
  Use when building new UI components.
metadata:
  author: wwt
---

body"#,
        );

        assert_eq!(metadata.name.as_deref(), Some("demo-skill"));
        assert_eq!(
            metadata.description.as_deref(),
            Some(
                "WWT design system, brand rules, and component patterns. Use when building new UI components."
            )
        );
    }

    #[test]
    fn metadata_parser_extracts_literal_block_description() {
        let metadata = parse_skill_frontmatter(
            r#"---
name: demo-skill
description: |
  First line.
  Second line.
version: 1.2.3
---

body"#,
        );

        assert_eq!(metadata.name.as_deref(), Some("demo-skill"));
        assert_eq!(
            metadata.description.as_deref(),
            Some("First line.\nSecond line.")
        );
        assert_eq!(metadata.version.as_deref(), Some("1.2.3"));
    }

    #[test]
    fn category_sidecar_invalid_slug_falls_back_to_none() {
        let metadata =
            parse_skill_gate_metadata(r#"{"category_assignment":{"mode":"auto","slug":"wrong"}}"#);

        assert!(metadata.category_assignment.is_none());
    }

    #[test]
    fn installing_skill_to_shared_library_without_classifier_places_it_in_uncategorized() {
        with_temp_home(|home| {
            let shared_dir = home.join("SharedSkills");
            let claude_dir = home.join(".claude").join("skills");
            let antigravity_dir = home.join(".gemini").join("antigravity").join("skills");
            let codex_dir = home.join(".codex").join("skills");

            fs::create_dir_all(&claude_dir).unwrap();
            fs::create_dir_all(&antigravity_dir).unwrap();
            fs::create_dir_all(&codex_dir).unwrap();

            let source_skill = claude_dir.join("share-me");
            create_skill(&source_skill);

            install_skill(source_skill.to_string_lossy().as_ref(), "Shared Library").unwrap();

            let shared_skill = shared_dir.join("uncategorized").join("share-me");
            assert!(
                shared_skill.exists(),
                "shared skill should exist in uncategorized"
            );
            assert!(
                shared_skill.join(SKILL_GATE_METADATA_FILE).exists(),
                "shared install should write sidecar metadata"
            );
        });
    }

    #[test]
    fn legacy_skill_hub_sidecar_is_still_read() {
        with_temp_home(|home| {
            let shared_skill = home
                .join("SharedSkills")
                .join("data-analysis")
                .join("legacy-sidecar");

            fs::create_dir_all(shared_skill.parent().unwrap()).unwrap();
            create_skill(&shared_skill);
            fs::write(
                shared_skill.join(LEGACY_SKILL_HUB_METADATA_FILE),
                r#"{"category_assignment":{"mode":"manual","slug":"data-analysis"}}"#,
            )
            .unwrap();
            let shared_canonical = fs::canonicalize(&shared_skill)
                .unwrap()
                .to_string_lossy()
                .to_string();

            let scanned_skill = scan_all_skills()
                .into_iter()
                .find(|skill| skill.canonical_path == shared_canonical)
                .expect("missing shared skill with legacy sidecar");

            assert_eq!(
                scanned_skill.category_assignment_mode,
                Some(CategoryAssignmentMode::Manual)
            );
        });
    }

    #[test]
    fn moving_shared_skill_to_new_category_updates_sidecar_and_relinks_agents() {
        with_temp_home(|home| {
            let shared_dir = home.join("SharedSkills");
            let claude_dir = home.join(".claude").join("skills");
            let antigravity_dir = home.join(".gemini").join("antigravity").join("skills");
            let codex_dir = home.join(".codex").join("skills");

            let shared_skill = shared_dir.join("uncategorized").join("move-me");
            fs::create_dir_all(shared_skill.parent().unwrap()).unwrap();
            fs::create_dir_all(&claude_dir).unwrap();
            fs::create_dir_all(&antigravity_dir).unwrap();
            fs::create_dir_all(&codex_dir).unwrap();

            create_skill(&shared_skill);
            write_skill_gate_metadata(
                &shared_skill,
                &SkillGateMetadata {
                    category_assignment: Some(CategoryAssignment {
                        mode: Some(CategoryAssignmentMode::Auto),
                        slug: Some(String::from("uncategorized")),
                        confidence: Some(0.51),
                        classified_at: Some(String::from("2026-04-08T00:00:00Z")),
                        reason: None,
                        model: None,
                    }),
                },
            )
            .unwrap();

            for linked_path in [
                claude_dir.join("move-me"),
                antigravity_dir.join("move-me"),
                codex_dir.join("move-me"),
            ] {
                symlink_dir(&shared_skill, &linked_path);
            }

            move_shared_skill_to_category(shared_skill.to_string_lossy().as_ref(), "data-analysis")
                .unwrap();

            let moved_skill = shared_dir.join("data-analysis").join("move-me");
            assert!(
                moved_skill.exists(),
                "shared skill should move to the new category"
            );
            assert!(
                !shared_dir.join("uncategorized").join("move-me").exists(),
                "old shared location should be removed"
            );

            let sidecar = fs::read_to_string(moved_skill.join(SKILL_GATE_METADATA_FILE)).unwrap();
            assert!(sidecar.contains("\"manual\""));
            assert!(sidecar.contains("\"data-analysis\""));

            for linked_path in [
                claude_dir.join("move-me"),
                antigravity_dir.join("move-me"),
                codex_dir.join("move-me"),
            ] {
                assert!(
                    linked_path.is_symlink(),
                    "shared agent entry should remain a symlink"
                );
                assert_eq!(
                    fs::canonicalize(&linked_path).unwrap(),
                    fs::canonicalize(&moved_skill).unwrap(),
                    "symlink should be repaired to the moved category path"
                );
            }
        });
    }

    #[test]
    fn scanned_skill_uses_canonical_path_for_symlinked_directories() {
        with_temp_home(|home| {
            let shared_dir = home.join("SharedSkills");
            let codex_dir = home.join(".codex").join("skills");

            fs::create_dir_all(&shared_dir).unwrap();
            fs::create_dir_all(&codex_dir).unwrap();

            let shared_skill = shared_dir.join("versioned-skill");
            create_skill(&shared_skill);

            let codex_link = codex_dir.join("versioned-skill");
            symlink_dir(&shared_skill, &codex_link);

            let skills = scan_all_skills();
            let codex_skill = skills
                .iter()
                .find(|skill| skill.agent == "Codex" && skill.name == "versioned-skill")
                .expect("expected Codex skill");
            let canonical_shared_skill = fs::canonicalize(&shared_skill).unwrap();

            assert_eq!(
                codex_skill.canonical_path,
                canonical_shared_skill.to_string_lossy(),
                "symlinked skills should track the real directory for deduped updates"
            );
        });
    }
}
