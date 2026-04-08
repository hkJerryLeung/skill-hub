use crate::scanner::{scan_all_skills, SkillInfo, UpdateCapability, UpdateStatus};
use reqwest::blocking::Client;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::{BTreeMap, HashSet};
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Manager};
use walkdir::WalkDir;

#[derive(Debug, Clone, PartialEq, Eq)]
struct GitHubSource {
    owner: String,
    repo: String,
    reference: String,
    skill_path: String,
}

fn parse_github_source(source: &str) -> GitHubSource {
    let trimmed = source.trim().trim_matches('"').trim_end_matches('/');
    let suffix = trimmed
        .strip_prefix("https://github.com/")
        .or_else(|| trimmed.strip_prefix("http://github.com/"))
        .unwrap_or(trimmed);

    let parts: Vec<&str> = suffix.split('/').filter(|segment| !segment.is_empty()).collect();
    let owner = parts.first().copied().unwrap_or_default().to_string();
    let repo = parts.get(1).copied().unwrap_or_default().to_string();

    let (reference, skill_path) = match parts.get(2).copied() {
        Some("tree") | Some("blob") => {
            let reference = parts.get(3).copied().unwrap_or("HEAD").to_string();
            let mut path_parts = parts[4..].to_vec();
            if path_parts.last().copied() == Some("SKILL.md") {
                path_parts.pop();
            }
            (reference, path_parts.join("/"))
        }
        _ => (String::from("HEAD"), String::new()),
    };

    GitHubSource {
        owner,
        repo,
        reference,
        skill_path,
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq)]
pub(crate) struct UpdateCache {
    pub(crate) entries: BTreeMap<String, UpdateCacheEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub(crate) struct UpdateCacheEntry {
    pub(crate) upstream_version: Option<String>,
    pub(crate) update_status: UpdateStatus,
    pub(crate) last_checked_at: Option<String>,
    pub(crate) source_digest: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
struct GitHubContentItem {
    name: String,
    path: String,
    sha: String,
    download_url: Option<String>,
    #[serde(rename = "type")]
    entry_type: String,
}

#[derive(Debug, Clone)]
struct RemoteFileDescriptor {
    relative_path: String,
    sha: String,
    download_url: String,
}

#[derive(Debug, Clone)]
struct RemoteSkillFile {
    relative_path: String,
    contents: Vec<u8>,
}

#[derive(Debug, Clone)]
struct RemoteSkillSnapshot {
    version: Option<String>,
    digest: String,
    files: Vec<RemoteSkillFile>,
}

#[derive(Debug, Default)]
struct BulkCheckSummary {
    checked: usize,
    update_available: usize,
    up_to_date: usize,
    manual_only: usize,
    errors: usize,
}

#[derive(Debug, Default)]
struct BulkUpdateSummary {
    updated: usize,
    skipped: usize,
    manual_only: usize,
    failed: usize,
}

fn determine_github_update_status(
    local_version: Option<&str>,
    remote_version: Option<&str>,
    cached_digest: Option<&str>,
    remote_digest: &str,
) -> UpdateStatus {
    match (local_version, remote_version) {
        (Some(local), Some(remote)) if local == remote => UpdateStatus::UpToDate,
        (_, Some(_)) => UpdateStatus::UpdateAvailable,
        _ => {
            if cached_digest == Some(remote_digest) {
                UpdateStatus::UpToDate
            } else {
                UpdateStatus::UpdateAvailable
            }
        }
    }
}

pub(crate) fn load_update_cache_from_path(path: &Path) -> Result<UpdateCache, String> {
    if !path.exists() {
        return Ok(UpdateCache::default());
    }

    let content = fs::read_to_string(path)
        .map_err(|error| format!("Failed to read update cache '{}': {}", path.display(), error))?;

    serde_json::from_str(&content)
        .map_err(|error| format!("Failed to parse update cache '{}': {}", path.display(), error))
}

pub(crate) fn save_update_cache_to_path(path: &Path, cache: &UpdateCache) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| {
            format!(
                "Failed to create update cache directory '{}': {}",
                parent.display(),
                error
            )
        })?;
    }

    let content = serde_json::to_string_pretty(cache)
        .map_err(|error| format!("Failed to serialize update cache: {}", error))?;

    fs::write(path, content)
        .map_err(|error| format!("Failed to write update cache '{}': {}", path.display(), error))
}

pub(crate) fn apply_cached_update_state(skills: &mut [SkillInfo], cache: &UpdateCache) {
    for skill in skills {
        let Some(entry) = cache.entries.get(&skill.canonical_path) else {
            continue;
        };

        skill.upstream_version = entry.upstream_version.clone();
        skill.update_status = entry.update_status.clone();
        skill.last_checked_at = entry.last_checked_at.clone();
    }
}

fn copy_path_recursive(source: &Path, destination: &Path) -> Result<(), String> {
    if source.is_dir() {
        fs::create_dir_all(destination).map_err(|error| {
            format!(
                "Failed to create directory '{}' while copying: {}",
                destination.display(),
                error
            )
        })?;

        for entry in fs::read_dir(source).map_err(|error| {
            format!(
                "Failed to read directory '{}' while copying: {}",
                source.display(),
                error
            )
        })? {
            let entry = entry.map_err(|error| format!("Failed to read directory entry: {}", error))?;
            copy_path_recursive(&entry.path(), &destination.join(entry.file_name()))?;
        }

        return Ok(());
    }

    if let Some(parent) = destination.parent() {
        fs::create_dir_all(parent).map_err(|error| {
            format!(
                "Failed to create parent directory '{}' while copying file: {}",
                parent.display(),
                error
            )
        })?;
    }

    fs::copy(source, destination).map_err(|error| {
        format!(
            "Failed to copy file '{}' to '{}': {}",
            source.display(),
            destination.display(),
            error
        )
    })?;

    Ok(())
}

fn backup_existing_path(existing_path: &Path, backup_path: &Path) -> Result<(), String> {
    if !existing_path.exists() {
        return Ok(());
    }

    copy_path_recursive(existing_path, backup_path)
}

fn remove_existing_path(path: &Path) -> Result<(), String> {
    if !path.exists() {
        return Ok(());
    }

    if path.is_dir() {
        fs::remove_dir_all(path).map_err(|error| {
            format!("Failed to remove directory '{}': {}", path.display(), error)
        })?;
    } else {
        fs::remove_file(path)
            .map_err(|error| format!("Failed to remove file '{}': {}", path.display(), error))?;
    }

    Ok(())
}

fn apply_remote_snapshot_to_local_skill(
    local_dir: &Path,
    remote_snapshot_dir: &Path,
    backup_root: &Path,
    _skill_name: &str,
) -> Result<(), String> {
    fs::create_dir_all(local_dir)
        .map_err(|error| format!("Failed to create local skill dir '{}': {}", local_dir.display(), error))?;
    fs::create_dir_all(backup_root)
        .map_err(|error| format!("Failed to create backup dir '{}': {}", backup_root.display(), error))?;

    for entry in WalkDir::new(remote_snapshot_dir).min_depth(1) {
        let entry = entry.map_err(|error| format!("Failed to walk remote snapshot: {}", error))?;
        let relative_path = entry
            .path()
            .strip_prefix(remote_snapshot_dir)
            .map_err(|error| format!("Failed to derive relative path: {}", error))?;
        let destination_path = local_dir.join(relative_path);

        if entry.file_type().is_dir() {
            if destination_path.exists() && !destination_path.is_dir() {
                let backup_path = backup_root.join(relative_path);
                backup_existing_path(&destination_path, &backup_path)?;
                remove_existing_path(&destination_path)?;
            }

            fs::create_dir_all(&destination_path).map_err(|error| {
                format!(
                    "Failed to create local directory '{}': {}",
                    destination_path.display(),
                    error
                )
            })?;
            continue;
        }

        if destination_path.exists() {
            let backup_path = backup_root.join(relative_path);
            backup_existing_path(&destination_path, &backup_path)?;
            remove_existing_path(&destination_path)?;
        } else if let Some(parent) = destination_path.parent() {
            fs::create_dir_all(parent).map_err(|error| {
                format!(
                    "Failed to create parent directory '{}' for updated file: {}",
                    parent.display(),
                    error
                )
            })?;
        }

        fs::copy(entry.path(), &destination_path).map_err(|error| {
            format!(
                "Failed to copy updated file '{}' to '{}': {}",
                entry.path().display(),
                destination_path.display(),
                error
            )
        })?;
    }

    Ok(())
}

fn strip_wrapping_quotes(value: &str) -> String {
    let trimmed = value.trim();
    if trimmed.len() >= 2 {
        let double_quoted = trimmed.starts_with('"') && trimmed.ends_with('"');
        let single_quoted = trimmed.starts_with('\'') && trimmed.ends_with('\'');
        if double_quoted || single_quoted {
            return trimmed[1..trimmed.len() - 1].to_string();
        }
    }

    trimmed.to_string()
}

fn extract_frontmatter_value(content: &str, key: &str) -> Option<String> {
    let mut lines = content.lines();
    if lines.next().map(str::trim) != Some("---") {
        return None;
    }

    for line in lines {
        let trimmed = line.trim();
        if trimmed == "---" {
            break;
        }

        let Some((candidate_key, raw_value)) = trimmed.split_once(':') else {
            continue;
        };

        if candidate_key.trim() == key {
            return Some(strip_wrapping_quotes(raw_value));
        }
    }

    None
}

fn now_timestamp() -> String {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
        .to_string()
}

fn github_client() -> Result<Client, String> {
    Client::builder()
        .user_agent("skill-hub/0.1.0")
        .build()
        .map_err(|error| format!("Failed to create HTTP client: {}", error))
}

fn validate_github_source(source: &str) -> Result<GitHubSource, String> {
    let parsed = parse_github_source(source);
    if parsed.owner.is_empty() || parsed.repo.is_empty() {
        return Err(format!("Unsupported GitHub source '{}'", source));
    }

    Ok(parsed)
}

pub(crate) fn cache_path_for_app(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map(|path: PathBuf| path.join("update-cache.json"))
        .map_err(|error| format!("Failed to resolve app data directory: {}", error))
}

pub(crate) fn backups_root_for_app(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map(|path: PathBuf| path.join("backups"))
        .map_err(|error| format!("Failed to resolve backups directory: {}", error))
}

pub(crate) fn load_update_cache(app: &AppHandle) -> Result<UpdateCache, String> {
    let cache_path = cache_path_for_app(app)?;
    load_update_cache_from_path(&cache_path)
}

pub(crate) fn save_update_cache(app: &AppHandle, cache: &UpdateCache) -> Result<(), String> {
    let cache_path = cache_path_for_app(app)?;
    save_update_cache_to_path(&cache_path, cache)
}

pub(crate) fn clear_update_cache(app: &AppHandle) -> Result<String, String> {
    let cache_path = cache_path_for_app(app)?;
    if !cache_path.exists() {
        return Ok(String::from("Update cache is already empty"));
    }

    fs::remove_file(&cache_path)
        .map_err(|error| format!("Failed to remove update cache '{}': {}", cache_path.display(), error))?;

    Ok(String::from("Cleared cached update status"))
}

pub(crate) fn hydrate_skills_from_cache(
    app: &AppHandle,
    skills: &mut [SkillInfo],
) -> Result<(), String> {
    let cache = load_update_cache(app)?;
    apply_cached_update_state(skills, &cache);
    Ok(())
}

fn dedupe_skills_by_canonical_path(skills: Vec<SkillInfo>) -> Vec<SkillInfo> {
    let mut seen = HashSet::new();
    let mut unique = Vec::new();

    for skill in skills {
        if seen.insert(skill.canonical_path.clone()) {
            unique.push(skill);
        }
    }

    unique
}

fn github_directory_api_url(source: &GitHubSource, path: &str) -> String {
    if path.is_empty() {
        format!(
            "https://api.github.com/repos/{}/{}/contents?ref={}",
            source.owner, source.repo, source.reference
        )
    } else {
        format!(
            "https://api.github.com/repos/{}/{}/contents/{}?ref={}",
            source.owner,
            source.repo,
            path.replace(' ', "%20"),
            source.reference
        )
    }
}

fn list_github_directory(
    client: &Client,
    source: &GitHubSource,
    path: &str,
) -> Result<Option<Vec<GitHubContentItem>>, String> {
    let response = client
        .get(github_directory_api_url(source, path))
        .send()
        .map_err(|error| format!("Failed to query GitHub contents: {}", error))?;

    if response.status() == reqwest::StatusCode::NOT_FOUND {
        return Ok(None);
    }

    let response = response
        .error_for_status()
        .map_err(|error| format!("GitHub contents request failed: {}", error))?;

    response
        .json::<Vec<GitHubContentItem>>()
        .map(Some)
        .map_err(|error| format!("Failed to decode GitHub contents response: {}", error))
}

fn directory_contains_skill_md(
    client: &Client,
    source: &GitHubSource,
    path: &str,
) -> Result<bool, String> {
    let Some(entries) = list_github_directory(client, source, path)? else {
        return Ok(false);
    };

    Ok(entries
        .iter()
        .any(|entry| entry.entry_type == "file" && entry.name == "SKILL.md"))
}

fn local_skill_directory_name(skill: &SkillInfo) -> String {
    Path::new(&skill.canonical_path)
        .file_name()
        .unwrap_or_else(|| Path::new(&skill.path).file_name().unwrap_or_default())
        .to_string_lossy()
        .to_string()
}

fn resolve_github_skill_path(
    client: &Client,
    source: &GitHubSource,
    skill: &SkillInfo,
) -> Result<String, String> {
    if !source.skill_path.is_empty() {
        return Ok(source.skill_path.clone());
    }

    if directory_contains_skill_md(client, source, "")? {
        return Ok(String::new());
    }

    let local_dir_name = local_skill_directory_name(skill);
    let candidates = [
        local_dir_name.clone(),
        format!("skills/{}", local_dir_name),
        format!("plugins/{}", local_dir_name),
    ];

    for candidate in candidates {
        if directory_contains_skill_md(client, source, &candidate)? {
            return Ok(candidate);
        }
    }

    Err(format!(
        "GitHub source '{}' does not resolve to a specific skill folder",
        skill.source.as_deref().unwrap_or_default()
    ))
}

fn list_github_files_recursive(
    client: &Client,
    source: &GitHubSource,
    resolved_skill_path: &str,
) -> Result<Vec<RemoteFileDescriptor>, String> {
    let mut stack = vec![resolved_skill_path.to_string()];
    let mut files = Vec::new();

    while let Some(current_path) = stack.pop() {
        let Some(entries) = list_github_directory(client, source, &current_path)? else {
            return Err(format!("GitHub path '{}' was not found", current_path));
        };

        for entry in entries {
            match entry.entry_type.as_str() {
                "dir" => stack.push(entry.path.clone()),
                "file" => {
                    let relative_path = if resolved_skill_path.is_empty() {
                        entry.path.clone()
                    } else {
                        entry
                            .path
                            .strip_prefix(&format!("{}/", resolved_skill_path))
                            .unwrap_or(&entry.path)
                            .to_string()
                    };

                    let download_url = entry.download_url.ok_or_else(|| {
                        format!("GitHub entry '{}' does not expose a download URL", entry.path)
                    })?;

                    files.push(RemoteFileDescriptor {
                        relative_path,
                        sha: entry.sha,
                        download_url,
                    });
                }
                _ => {}
            }
        }
    }

    files.sort_by(|left, right| left.relative_path.cmp(&right.relative_path));
    Ok(files)
}

fn compute_remote_digest(files: &[RemoteFileDescriptor]) -> String {
    let mut hasher = Sha256::new();
    for file in files {
        hasher.update(file.relative_path.as_bytes());
        hasher.update([0]);
        hasher.update(file.sha.as_bytes());
        hasher.update([b'\n']);
    }

    format!("{:x}", hasher.finalize())
}

fn download_remote_file(client: &Client, url: &str) -> Result<Vec<u8>, String> {
    client
        .get(url)
        .send()
        .map_err(|error| format!("Failed to download remote file '{}': {}", url, error))?
        .error_for_status()
        .map_err(|error| format!("Remote file request failed for '{}': {}", url, error))?
        .bytes()
        .map(|bytes| bytes.to_vec())
        .map_err(|error| format!("Failed to read remote file '{}': {}", url, error))
}

fn fetch_github_snapshot(
    client: &Client,
    skill: &SkillInfo,
    include_contents: bool,
) -> Result<RemoteSkillSnapshot, String> {
    let source_value = skill
        .source
        .as_deref()
        .ok_or_else(|| format!("Skill '{}' has no source", skill.name))?;
    let parsed_source = validate_github_source(source_value)?;
    let resolved_skill_path = resolve_github_skill_path(client, &parsed_source, skill)?;
    let files = list_github_files_recursive(client, &parsed_source, &resolved_skill_path)?;

    let skill_md = files
        .iter()
        .find(|file| file.relative_path == "SKILL.md")
        .ok_or_else(|| format!("Remote skill '{}' does not contain SKILL.md", skill.name))?;

    let skill_md_bytes = download_remote_file(client, &skill_md.download_url)?;
    let skill_md_content = String::from_utf8_lossy(&skill_md_bytes);
    let remote_version = extract_frontmatter_value(&skill_md_content, "version");
    let digest = compute_remote_digest(&files);

    let mut downloaded_files = Vec::new();
    if include_contents {
        for file in &files {
            let contents = if file.relative_path == "SKILL.md" {
                skill_md_bytes.clone()
            } else {
                download_remote_file(client, &file.download_url)?
            };

            downloaded_files.push(RemoteSkillFile {
                relative_path: file.relative_path.clone(),
                contents,
            });
        }
    }

    Ok(RemoteSkillSnapshot {
        version: remote_version,
        digest,
        files: downloaded_files,
    })
}

fn manual_or_external_entry(skill: &SkillInfo, remote_version: Option<String>) -> UpdateCacheEntry {
    let update_status = match (skill.update_capability.clone(), skill.version.as_deref(), remote_version.as_deref()) {
        (UpdateCapability::Manual, Some(_), _) => UpdateStatus::ManualOnly,
        (UpdateCapability::Manual, None, _) => UpdateStatus::Unversioned,
        (_, _, Some(remote)) if skill.version.as_deref() == Some(remote) => UpdateStatus::UpToDate,
        (_, _, Some(_)) => UpdateStatus::UpdateAvailable,
        (_, Some(_), None) => UpdateStatus::ManualOnly,
        (_, None, None) => UpdateStatus::Unversioned,
    };

    UpdateCacheEntry {
        upstream_version: remote_version,
        update_status,
        last_checked_at: Some(now_timestamp()),
        source_digest: None,
    }
}

fn error_entry(existing: Option<&UpdateCacheEntry>) -> UpdateCacheEntry {
    UpdateCacheEntry {
        upstream_version: existing.and_then(|entry| entry.upstream_version.clone()),
        update_status: UpdateStatus::Error,
        last_checked_at: Some(now_timestamp()),
        source_digest: existing.and_then(|entry| entry.source_digest.clone()),
    }
}

fn check_skill_against_source(
    client: &Client,
    skill: &SkillInfo,
    existing: Option<&UpdateCacheEntry>,
) -> Result<UpdateCacheEntry, String> {
    match skill.update_capability {
        UpdateCapability::GitHub => {
            let snapshot = fetch_github_snapshot(client, skill, false)?;
            Ok(UpdateCacheEntry {
                upstream_version: snapshot.version.clone(),
                update_status: determine_github_update_status(
                    skill.version.as_deref(),
                    snapshot.version.as_deref(),
                    existing.and_then(|entry| entry.source_digest.as_deref()),
                    &snapshot.digest,
                ),
                last_checked_at: Some(now_timestamp()),
                source_digest: Some(snapshot.digest),
            })
        }
        UpdateCapability::External => {
            let source = skill
                .source
                .as_deref()
                .ok_or_else(|| format!("Skill '{}' has no source URL", skill.name))?;
            let content = client
                .get(source)
                .send()
                .map_err(|error| format!("Failed to fetch external source '{}': {}", source, error))?
                .error_for_status()
                .map_err(|error| format!("External source request failed for '{}': {}", source, error))?
                .text()
                .map_err(|error| format!("Failed to read external source '{}': {}", source, error))?;
            Ok(manual_or_external_entry(
                skill,
                extract_frontmatter_value(&content, "version"),
            ))
        }
        UpdateCapability::Manual => Ok(manual_or_external_entry(skill, None)),
    }
}

fn backup_directory_for_skill(backups_root: &Path, skill_name: &str) -> PathBuf {
    backups_root.join(now_timestamp()).join(skill_name)
}

fn write_backup_metadata(
    backup_root: &Path,
    skill: &SkillInfo,
    upstream_version: Option<&str>,
) -> Result<(), String> {
    #[derive(Serialize)]
    struct BackupMetadata<'a> {
        skill_name: &'a str,
        source: Option<&'a str>,
        previous_version: Option<&'a str>,
        upstream_version: Option<&'a str>,
        backed_up_at: String,
    }

    let metadata = BackupMetadata {
        skill_name: &skill.name,
        source: skill.source.as_deref(),
        previous_version: skill.version.as_deref(),
        upstream_version,
        backed_up_at: now_timestamp(),
    };

    let json = serde_json::to_string_pretty(&metadata)
        .map_err(|error| format!("Failed to serialize backup metadata: {}", error))?;
    fs::create_dir_all(backup_root).map_err(|error| {
        format!(
            "Failed to create backup metadata directory '{}': {}",
            backup_root.display(),
            error
        )
    })?;
    fs::write(backup_root.join("metadata.json"), json).map_err(|error| {
        format!(
            "Failed to write backup metadata '{}': {}",
            backup_root.join("metadata.json").display(),
            error
        )
    })
}

fn write_remote_snapshot_to_dir(snapshot: &RemoteSkillSnapshot, directory: &Path) -> Result<(), String> {
    if directory.exists() {
        fs::remove_dir_all(directory).map_err(|error| {
            format!(
                "Failed to clear temporary snapshot directory '{}': {}",
                directory.display(),
                error
            )
        })?;
    }

    fs::create_dir_all(directory).map_err(|error| {
        format!(
            "Failed to create temporary snapshot directory '{}': {}",
            directory.display(),
            error
        )
    })?;

    for file in &snapshot.files {
        let path = directory.join(&file.relative_path);
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).map_err(|error| {
                format!(
                    "Failed to create temporary snapshot parent '{}': {}",
                    parent.display(),
                    error
                )
            })?;
        }

        fs::write(&path, &file.contents).map_err(|error| {
            format!(
                "Failed to write temporary snapshot file '{}': {}",
                path.display(),
                error
            )
        })?;
    }

    Ok(())
}

fn find_skill_by_path(skill_path: &str) -> Result<SkillInfo, String> {
    scan_all_skills()
        .into_iter()
        .find(|skill| skill.path == skill_path)
        .ok_or_else(|| format!("Skill '{}' was not found", skill_path))
}

fn update_github_backed_skill(
    app: &AppHandle,
    client: &Client,
    skill: &SkillInfo,
) -> Result<UpdateCacheEntry, String> {
    let snapshot = fetch_github_snapshot(client, skill, true)?;
    let backups_root = backups_root_for_app(app)?;
    let backup_dir = backup_directory_for_skill(&backups_root, &local_skill_directory_name(skill));
    let temp_dir = std::env::temp_dir().join(format!(
        "skill-hub-remote-snapshot-{}-{}",
        local_skill_directory_name(skill),
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_nanos()
    ));

    write_remote_snapshot_to_dir(&snapshot, &temp_dir)?;
    write_backup_metadata(&backup_dir, skill, snapshot.version.as_deref())?;
    let apply_result = apply_remote_snapshot_to_local_skill(
        Path::new(&skill.canonical_path),
        &temp_dir,
        &backup_dir,
        &skill.name,
    );
    let _ = fs::remove_dir_all(&temp_dir);
    apply_result?;

    Ok(UpdateCacheEntry {
        upstream_version: snapshot.version,
        update_status: UpdateStatus::UpToDate,
        last_checked_at: Some(now_timestamp()),
        source_digest: Some(snapshot.digest),
    })
}

pub(crate) fn check_skill_updates(app: &AppHandle, skill_path: &str) -> Result<String, String> {
    let skill = find_skill_by_path(skill_path)?;
    let client = github_client()?;
    let mut cache = load_update_cache(app)?;
    let existing = cache.entries.get(&skill.canonical_path);

    let entry = match check_skill_against_source(&client, &skill, existing) {
        Ok(entry) => entry,
        Err(error) => {
            cache
                .entries
                .insert(skill.canonical_path.clone(), error_entry(existing));
            save_update_cache(app, &cache)?;
            return Err(error);
        }
    };

    let status = entry.update_status.clone();
    cache.entries.insert(skill.canonical_path.clone(), entry);
    save_update_cache(app, &cache)?;

    let message = match status {
        UpdateStatus::UpdateAvailable => format!("Update available for '{}'", skill.name),
        UpdateStatus::UpToDate => format!("'{}' is up to date", skill.name),
        UpdateStatus::ManualOnly => format!("'{}' requires manual updates", skill.name),
        UpdateStatus::Unversioned => format!("'{}' is unversioned", skill.name),
        UpdateStatus::Unknown => format!("Checked '{}'", skill.name),
        UpdateStatus::Error => format!("Update check failed for '{}'", skill.name),
    };

    Ok(message)
}

pub(crate) fn check_all_skill_updates(app: &AppHandle) -> Result<String, String> {
    let client = github_client()?;
    let skills = dedupe_skills_by_canonical_path(scan_all_skills());
    let mut cache = load_update_cache(app)?;
    let mut summary = BulkCheckSummary::default();

    for skill in skills {
        summary.checked += 1;
        let existing = cache.entries.get(&skill.canonical_path);
        match check_skill_against_source(&client, &skill, existing) {
            Ok(entry) => {
                match entry.update_status {
                    UpdateStatus::UpdateAvailable => summary.update_available += 1,
                    UpdateStatus::UpToDate => summary.up_to_date += 1,
                    UpdateStatus::ManualOnly | UpdateStatus::Unversioned => summary.manual_only += 1,
                    UpdateStatus::Unknown => {}
                    UpdateStatus::Error => summary.errors += 1,
                }
                cache.entries.insert(skill.canonical_path.clone(), entry);
            }
            Err(_) => {
                summary.errors += 1;
                cache
                    .entries
                    .insert(skill.canonical_path.clone(), error_entry(existing));
            }
        }
    }

    save_update_cache(app, &cache)?;

    Ok(format!(
        "Checked {} skills: {} updates available, {} up to date, {} manual-only, {} errors",
        summary.checked,
        summary.update_available,
        summary.up_to_date,
        summary.manual_only,
        summary.errors
    ))
}

pub(crate) fn update_single_skill(app: &AppHandle, skill_path: &str) -> Result<String, String> {
    let skill = find_skill_by_path(skill_path)?;
    if skill.update_capability != UpdateCapability::GitHub {
        return Err(format!("'{}' does not support automatic updates", skill.name));
    }

    let client = github_client()?;
    let mut cache = load_update_cache(app)?;
    let entry = update_github_backed_skill(app, &client, &skill)?;
    cache.entries.insert(skill.canonical_path.clone(), entry);
    save_update_cache(app, &cache)?;

    Ok(format!("Updated '{}'", skill.name))
}

pub(crate) fn update_all_github_skills(app: &AppHandle) -> Result<String, String> {
    let client = github_client()?;
    let skills = dedupe_skills_by_canonical_path(scan_all_skills());
    let mut cache = load_update_cache(app)?;
    let mut summary = BulkUpdateSummary::default();

    for skill in skills {
        if skill.update_capability != UpdateCapability::GitHub {
            summary.manual_only += 1;
            continue;
        }

        let existing = cache.entries.get(&skill.canonical_path);
        let check_entry = match check_skill_against_source(&client, &skill, existing) {
            Ok(entry) => entry,
            Err(_) => {
                summary.failed += 1;
                cache
                    .entries
                    .insert(skill.canonical_path.clone(), error_entry(existing));
                continue;
            }
        };

        if check_entry.update_status != UpdateStatus::UpdateAvailable {
            summary.skipped += 1;
            cache.entries.insert(skill.canonical_path.clone(), check_entry);
            continue;
        }

        match update_github_backed_skill(app, &client, &skill) {
            Ok(entry) => {
                summary.updated += 1;
                cache.entries.insert(skill.canonical_path.clone(), entry);
            }
            Err(_) => {
                summary.failed += 1;
                cache
                    .entries
                    .insert(skill.canonical_path.clone(), error_entry(existing));
            }
        }
    }

    save_update_cache(app, &cache)?;

    Ok(format!(
        "Updated {} skills, skipped {}, manual-only {}, failed {}",
        summary.updated,
        summary.skipped,
        summary.manual_only,
        summary.failed
    ))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::scanner::{SkillInfo, UpdateCapability};
    use std::fs;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn temp_dir(label: &str) -> std::path::PathBuf {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let path = std::env::temp_dir().join(format!("skill-hub-{}-{}", label, unique));
        fs::create_dir_all(&path).unwrap();
        path
    }

    fn skill_fixture(path: &str) -> SkillInfo {
        SkillInfo {
            name: String::from("demo-skill"),
            description: String::from("Demo"),
            path: String::from(path),
            canonical_path: String::from(path),
            agent: String::from("Codex"),
            is_symlink: false,
            category: None,
            version: Some(String::from("1.0.0")),
            source: Some(String::from("https://github.com/example/skills/tree/main/demo-skill")),
            update_capability: UpdateCapability::GitHub,
            update_status: UpdateStatus::Unknown,
            upstream_version: None,
            last_checked_at: None,
        }
    }

    #[test]
    fn github_source_parser_supports_repo_tree_and_blob_urls() {
        let repo = parse_github_source("https://github.com/example/skills");
        assert_eq!(repo.owner, "example");
        assert_eq!(repo.repo, "skills");
        assert_eq!(repo.reference, "HEAD");
        assert_eq!(repo.skill_path, "");

        let tree = parse_github_source(
            "https://github.com/example/skills/tree/main/plugins/upgrading-expo",
        );
        assert_eq!(tree.reference, "main");
        assert_eq!(tree.skill_path, "plugins/upgrading-expo");

        let blob = parse_github_source(
            "https://github.com/example/skills/blob/main/plugins/upgrading-expo/SKILL.md",
        );
        assert_eq!(blob.reference, "main");
        assert_eq!(blob.skill_path, "plugins/upgrading-expo");
    }

    #[test]
    fn github_update_status_prefers_version_and_falls_back_to_digest() {
        assert_eq!(
            determine_github_update_status(
                Some("1.2.3"),
                Some("1.2.3"),
                Some("digest-a"),
                "digest-a",
            ),
            UpdateStatus::UpToDate
        );

        assert_eq!(
            determine_github_update_status(
                Some("1.2.3"),
                Some("1.3.0"),
                Some("digest-a"),
                "digest-b",
            ),
            UpdateStatus::UpdateAvailable
        );

        assert_eq!(
            determine_github_update_status(None, None, Some("digest-a"), "digest-b"),
            UpdateStatus::UpdateAvailable
        );
    }

    #[test]
    fn cache_round_trip_persists_update_state() {
        let temp_root = temp_dir("cache-round-trip");
        let cache_path = temp_root.join("update-cache.json");

        let mut cache = UpdateCache::default();
        cache.entries.insert(
            String::from("/tmp/demo-skill"),
            UpdateCacheEntry {
                upstream_version: Some(String::from("1.1.0")),
                update_status: UpdateStatus::UpdateAvailable,
                last_checked_at: Some(String::from("2026-04-07T23:00:00Z")),
                source_digest: Some(String::from("digest-1")),
            },
        );

        save_update_cache_to_path(&cache_path, &cache).unwrap();
        let reloaded = load_update_cache_from_path(&cache_path).unwrap();

        assert_eq!(
            reloaded
                .entries
                .get("/tmp/demo-skill")
                .and_then(|entry| entry.upstream_version.as_deref()),
            Some("1.1.0")
        );

        let _ = fs::remove_dir_all(temp_root);
    }

    #[test]
    fn applying_cache_updates_skill_status_fields() {
        let cache = UpdateCache {
            entries: [(
                String::from("/tmp/demo-skill"),
                UpdateCacheEntry {
                    upstream_version: Some(String::from("1.1.0")),
                    update_status: UpdateStatus::UpdateAvailable,
                    last_checked_at: Some(String::from("2026-04-07T23:00:00Z")),
                    source_digest: Some(String::from("digest-2")),
                },
            )]
            .into_iter()
            .collect(),
        };

        let mut skills = vec![skill_fixture("/tmp/demo-skill")];
        apply_cached_update_state(&mut skills, &cache);

        assert_eq!(skills[0].upstream_version.as_deref(), Some("1.1.0"));
        assert_eq!(skills[0].update_status, UpdateStatus::UpdateAvailable);
        assert_eq!(
            skills[0].last_checked_at.as_deref(),
            Some("2026-04-07T23:00:00Z")
        );
    }

    #[test]
    fn apply_update_overwrites_remote_files_preserves_local_extras_and_creates_backup() {
        let temp_root = temp_dir("apply-update");
        let local_dir = temp_root.join("local-skill");
        let remote_dir = temp_root.join("remote-skill");
        let backup_root = temp_root.join("backups");

        fs::create_dir_all(local_dir.join("notes")).unwrap();
        fs::create_dir_all(&remote_dir).unwrap();

        fs::write(
            local_dir.join("SKILL.md"),
            "---\nversion: 1.0.0\nsource: https://github.com/example/skills/tree/main/demo-skill\n---\nbody\n",
        )
        .unwrap();
        fs::write(local_dir.join("helper.txt"), "local helper\n").unwrap();
        fs::write(local_dir.join("notes").join("keep.txt"), "keep me\n").unwrap();

        fs::write(
            remote_dir.join("SKILL.md"),
            "---\nversion: 1.1.0\nsource: https://github.com/example/skills/tree/main/demo-skill\n---\nupdated body\n",
        )
        .unwrap();
        fs::write(remote_dir.join("helper.txt"), "remote helper\n").unwrap();

        apply_remote_snapshot_to_local_skill(
            &local_dir,
            &remote_dir,
            &backup_root,
            "demo-skill",
        )
        .unwrap();

        assert!(
            local_dir.join("notes").join("keep.txt").exists(),
            "local-only files should be preserved"
        );
        assert_eq!(
            fs::read_to_string(local_dir.join("helper.txt")).unwrap(),
            "remote helper\n"
        );
        assert!(
            backup_root.join("helper.txt").exists(),
            "overwritten files should be backed up"
        );
        assert!(
            fs::read_to_string(local_dir.join("SKILL.md"))
                .unwrap()
                .contains("version: 1.1.0"),
            "updated SKILL.md should carry the upstream version"
        );

        let _ = fs::remove_dir_all(temp_root);
    }
}
