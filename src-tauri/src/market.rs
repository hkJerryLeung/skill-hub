use crate::scanner;
use crate::settings;
use rayon::prelude::*;
use reqwest::blocking::Client;
use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Write;
use std::path::{Component, Path, PathBuf};
use std::process::Command;
use std::time::{SystemTime, UNIX_EPOCH};
use walkdir::WalkDir;

const CACHE_TTL_SECS: u64 = 3600;

const REQUEST_USER_AGENT: &str = "skill-gate/0.1";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct RemoteMarketEntry {
    pub source: String,
    pub repo: String,
    pub github_url: String,
    pub skill_id: String,
    pub name: String,
    pub installs: Option<u64>,
    pub summary: Option<String>,
    pub market_url: String,
    pub install_command: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct CachedMarket {
    fetched_at: u64,
    entries: Vec<RemoteMarketEntry>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct GitHubInstallRequest {
    repo: String,
    branch: Option<String>,
    subdir: Option<String>,
}

#[derive(Debug, Clone)]
struct DownloadedRepository {
    root: PathBuf,
    branch: String,
}

pub fn fetch_remote_market(
    source: &str,
    force_refresh: bool,
) -> Result<Vec<RemoteMarketEntry>, String> {
    if !force_refresh {
        if let Some(cached) = read_cache(source) {
            return Ok(cached);
        }
    }

    let entries = match source {
        "skills.sh" => {
            let html = fetch_text("https://skills.sh/")?;
            Ok(parse_skills_sh_leaderboard(&html, 24))
        }
        "huggingface" => {
            let html = fetch_text("https://skills.sh/huggingface/skills")?;
            Ok(parse_huggingface_repository_page(&html, 24))
        }
        other => Err(format!("Unsupported market source: {}", other)),
    }?;

    let enriched = enrich_market_entries(entries);
    write_cache(source, &enriched);
    Ok(enriched)
}

pub fn install_skill_from_github(
    github_url: &str,
    target_agent: &str,
    skill_name: Option<&str>,
    market_source: Option<&str>,
    market_url: Option<&str>,
) -> Result<String, String> {
    let request = parse_github_install_request(github_url)?;
    let temp_root = temp_dir("github-install");

    let result = (|| -> Result<String, String> {
        let download = download_and_extract_repository(&request, &temp_root)?;
        let skill_dir =
            resolve_skill_directory(&download.root, request.subdir.as_deref(), skill_name)?;
        let recorded_source = build_recorded_source_url(&request, &download, &skill_dir)?;

        upsert_install_metadata(&skill_dir, &recorded_source, market_source, market_url)?;

        scanner::install_skill(skill_dir.to_string_lossy().as_ref(), target_agent)
    })();

    let _ = fs::remove_dir_all(&temp_root);
    result
}

fn fetch_text(url: &str) -> Result<String, String> {
    Client::new()
        .get(url)
        .header("User-Agent", REQUEST_USER_AGENT)
        .send()
        .map_err(|error| format!("Failed to fetch '{}': {}", url, error))?
        .error_for_status()
        .map_err(|error| format!("Failed to fetch '{}': {}", url, error))?
        .text()
        .map_err(|error| format!("Failed to read '{}': {}", url, error))
}

fn parse_skills_sh_leaderboard(html: &str, limit: usize) -> Vec<RemoteMarketEntry> {
    let normalized = html.replace("\\\"", "\"");
    let mut rest = normalized.as_str();
    let mut entries = Vec::new();

    while let Some(source_start) = rest.find("\"source\":\"") {
        rest = &rest[source_start + "\"source\":\"".len()..];
        let Some(source_end) = rest.find('"') else {
            break;
        };
        let source = &rest[..source_end];
        rest = &rest[source_end..];

        let Some(skill_id_start) = rest.find("\"skillId\":\"") else {
            break;
        };
        rest = &rest[skill_id_start + "\"skillId\":\"".len()..];
        let Some(skill_id_end) = rest.find('"') else {
            break;
        };
        let skill_id = &rest[..skill_id_end];
        rest = &rest[skill_id_end..];

        let Some(name_start) = rest.find("\"name\":\"") else {
            break;
        };
        rest = &rest[name_start + "\"name\":\"".len()..];
        let Some(name_end) = rest.find('"') else {
            break;
        };
        let name = &rest[..name_end];
        rest = &rest[name_end..];

        let Some(installs_start) = rest.find("\"installs\":") else {
            break;
        };
        rest = &rest[installs_start + "\"installs\":".len()..];
        let installs_end = rest
            .find(|ch: char| !ch.is_ascii_digit())
            .unwrap_or(rest.len());
        let installs = rest[..installs_end].parse::<u64>().ok();
        rest = &rest[installs_end..];

        entries.push(RemoteMarketEntry {
            source: String::from("skills.sh"),
            repo: source.to_string(),
            github_url: format!("https://github.com/{}", source),
            skill_id: skill_id.to_string(),
            name: name.to_string(),
            installs,
            summary: None,
            market_url: market_url_for_skill(source, skill_id),
            install_command: None,
        });

        if entries.len() >= limit {
            break;
        }
    }

    entries
}

fn parse_huggingface_repository_page(html: &str, limit: usize) -> Vec<RemoteMarketEntry> {
    let mut rest = html;
    let mut entries = Vec::new();

    while let Some(link_start) = rest.find("href=\"/huggingface/skills/") {
        rest = &rest[link_start + "href=\"/huggingface/skills/".len()..];
        let Some(link_end) = rest.find('"') else {
            break;
        };
        let skill_id = &rest[..link_end];
        rest = &rest[link_end..];

        let Some(name_start) = rest.find("<h3") else {
            break;
        };
        rest = &rest[name_start..];
        let Some(name_tag_end) = rest.find('>') else {
            break;
        };
        rest = &rest[name_tag_end + 1..];
        let Some(name_end) = rest.find("</h3>") else {
            break;
        };
        let name = rest[..name_end].trim();
        rest = &rest[name_end..];

        let Some(installs_marker) = rest.find("font-mono text-sm text-foreground\">") else {
            break;
        };
        rest = &rest[installs_marker + "font-mono text-sm text-foreground\">".len()..];
        let Some(installs_end) = rest.find('<') else {
            break;
        };
        let installs = rest[..installs_end].trim().parse::<u64>().ok();
        rest = &rest[installs_end..];

        entries.push(RemoteMarketEntry {
            source: String::from("huggingface"),
            repo: String::from("huggingface/skills"),
            github_url: String::from("https://github.com/huggingface/skills"),
            skill_id: skill_id.to_string(),
            name: name.to_string(),
            installs,
            summary: None,
            market_url: market_url_for_skill("huggingface/skills", skill_id),
            install_command: None,
        });

        if entries.len() >= limit {
            break;
        }
    }

    entries
}

fn parse_github_install_request(github_url: &str) -> Result<GitHubInstallRequest, String> {
    let trimmed = github_url.trim().trim_end_matches('/');
    let without_suffix = trimmed.trim_end_matches(".git");
    let prefix = "https://github.com/";
    if !without_suffix.starts_with(prefix) {
        return Err(String::from(
            "GitHub URL must start with https://github.com/",
        ));
    }

    let path = &without_suffix[prefix.len()..];
    let segments = path.split('/').collect::<Vec<_>>();
    if segments.len() < 2 {
        return Err(String::from("GitHub URL must include owner and repository"));
    }

    let repo = format!("{}/{}", segments[0], segments[1]);
    if segments.len() == 2 {
        return Ok(GitHubInstallRequest {
            repo,
            branch: None,
            subdir: None,
        });
    }

    if segments.len() >= 5 && matches!(segments[2], "tree" | "blob") {
        return Ok(GitHubInstallRequest {
            repo,
            branch: Some(segments[3].to_string()),
            subdir: Some(segments[4..].join("/")),
        });
    }

    Err(String::from(
        "Unsupported GitHub URL. Use a repository URL or a tree URL to a skill folder.",
    ))
}

fn download_and_extract_repository(
    request: &GitHubInstallRequest,
    temp_root: &Path,
) -> Result<DownloadedRepository, String> {
    fs::create_dir_all(temp_root).map_err(|error| {
        format!(
            "Failed to create temp dir '{}': {}",
            temp_root.display(),
            error
        )
    })?;

    let archive_path = temp_root.join("repo.tar.gz");
    let extract_root = temp_root.join("extract");
    fs::create_dir_all(&extract_root).map_err(|error| {
        format!(
            "Failed to create extract dir '{}': {}",
            extract_root.display(),
            error
        )
    })?;

    let client = Client::new();
    let candidate_branches = request
        .branch
        .clone()
        .map(|branch| vec![branch])
        .unwrap_or_else(|| vec![String::from("main"), String::from("master")]);

    let mut downloaded_branch: Option<String> = None;
    for branch in &candidate_branches {
        let archive_url = format!(
            "https://codeload.github.com/{}/tar.gz/refs/heads/{}",
            request.repo, branch
        );

        let response = client
            .get(&archive_url)
            .header("User-Agent", REQUEST_USER_AGENT)
            .send()
            .map_err(|error| format!("Failed to download '{}': {}", archive_url, error))?;

        if !response.status().is_success() {
            continue;
        }

        let bytes = response
            .bytes()
            .map_err(|error| format!("Failed to read archive '{}': {}", archive_url, error))?;
        let mut file = fs::File::create(&archive_path).map_err(|error| {
            format!(
                "Failed to create archive '{}': {}",
                archive_path.display(),
                error
            )
        })?;
        file.write_all(&bytes).map_err(|error| {
            format!(
                "Failed to write archive '{}': {}",
                archive_path.display(),
                error
            )
        })?;
        downloaded_branch = Some(branch.clone());
        break;
    }

    let branch = downloaded_branch
        .ok_or_else(|| format!("Could not download repository archive for {}", request.repo))?;

    let status = Command::new("tar")
        .arg("-xzf")
        .arg(&archive_path)
        .arg("-C")
        .arg(&extract_root)
        .status()
        .map_err(|error| format!("Failed to extract archive with tar: {}", error))?;

    if !status.success() {
        return Err(String::from("Failed to extract repository archive"));
    }

    let repo_root = fs::read_dir(&extract_root)
        .map_err(|error| {
            format!(
                "Failed to inspect extract dir '{}': {}",
                extract_root.display(),
                error
            )
        })?
        .filter_map(Result::ok)
        .map(|entry| entry.path())
        .find(|path| path.is_dir())
        .ok_or_else(|| {
            String::from("Repository archive did not contain an extracted root directory")
        })?;

    Ok(DownloadedRepository {
        root: repo_root,
        branch,
    })
}

fn market_url_for_skill(repo: &str, skill_id: &str) -> String {
    format!("https://skills.sh/{}/{}", repo, skill_id)
}

fn enrich_market_entries(entries: Vec<RemoteMarketEntry>) -> Vec<RemoteMarketEntry> {
    entries
        .into_par_iter()
        .map(|entry| {
            let fallback = entry.clone();
            enrich_market_entry(entry).unwrap_or(fallback)
        })
        .collect()
}

fn cache_path(source: &str) -> Option<PathBuf> {
    let root = settings::config_root().ok()?;
    let cache_dir = root.join("cache");
    let filename = format!("market-{}.json", source.replace('/', "-"));
    Some(cache_dir.join(filename))
}

fn read_cache(source: &str) -> Option<Vec<RemoteMarketEntry>> {
    let path = cache_path(source)?;
    let content = fs::read_to_string(&path).ok()?;
    let cached: CachedMarket = serde_json::from_str(&content).ok()?;

    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();

    if now.saturating_sub(cached.fetched_at) > CACHE_TTL_SECS {
        return None;
    }

    Some(cached.entries)
}

fn write_cache(source: &str, entries: &[RemoteMarketEntry]) {
    let Some(path) = cache_path(source) else {
        return;
    };

    if let Some(parent) = path.parent() {
        let _ = fs::create_dir_all(parent);
    }

    let cached = CachedMarket {
        fetched_at: SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs(),
        entries: entries.to_vec(),
    };

    if let Ok(json) = serde_json::to_string_pretty(&cached) {
        let _ = fs::write(&path, json);
    }
}

fn enrich_market_entry(mut entry: RemoteMarketEntry) -> Result<RemoteMarketEntry, String> {
    let detail_html = fetch_text(&entry.market_url)?;
    let detail = parse_market_detail_page(&detail_html);
    entry.summary = detail.summary;
    entry.install_command = detail.install_command;
    Ok(entry)
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct MarketDetail {
    summary: Option<String>,
    install_command: Option<String>,
}

fn parse_market_detail_page(html: &str) -> MarketDetail {
    let install_command = extract_between(html, "<code class=\"truncate\">", "</code>")
        .map(|value| {
            strip_html(&value)
                .trim_start_matches('$')
                .trim()
                .to_string()
        })
        .filter(|value| !value.is_empty());

    let summary = extract_summary_block(html)
        .map(|value| strip_html(&value))
        .filter(|value| !value.is_empty());

    MarketDetail {
        summary,
        install_command,
    }
}

fn extract_summary_block(html: &str) -> Option<String> {
    if let Some(summary_start) = html.find("Summary</div>") {
        let after_summary = &html[summary_start..];
        let prose_start = after_summary.find("<div class=\"prose")?;
        let prose_html = &after_summary[prose_start..];
        let paragraph = extract_between(prose_html, "<p>", "</p>")?;
        return Some(paragraph);
    }

    let skill_md_start = html.find("SKILL.md</span>")?;
    let after_skill_md = &html[skill_md_start..];
    let paragraph = extract_between(after_skill_md, "<p>", "</p>")?;
    Some(paragraph)
}

fn extract_between(haystack: &str, start: &str, end: &str) -> Option<String> {
    let start_index = haystack.find(start)? + start.len();
    let remaining = &haystack[start_index..];
    let end_index = remaining.find(end)?;
    Some(remaining[..end_index].to_string())
}

fn strip_html(value: &str) -> String {
    value
        .replace("<strong>", "")
        .replace("</strong>", "")
        .replace("<!-- -->", "")
        .replace("&#x27;", "'")
        .replace("&#x3C;", "<")
        .replace("&#x26;", "&")
        .replace("&amp;", "&")
        .replace("&quot;", "\"")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .split('<')
        .map(|segment| segment.split('>').last().unwrap_or_default())
        .collect::<Vec<_>>()
        .join(" ")
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

fn build_recorded_source_url(
    request: &GitHubInstallRequest,
    download: &DownloadedRepository,
    skill_dir: &Path,
) -> Result<String, String> {
    let relative = skill_dir
        .strip_prefix(&download.root)
        .map_err(|error| format!("Failed to derive relative skill path: {}", error))?;
    let relative_path = relative.to_string_lossy().replace('\\', "/");

    if relative_path.is_empty() {
        return Ok(format!(
            "https://github.com/{}/tree/{}",
            request.repo, download.branch
        ));
    }

    Ok(format!(
        "https://github.com/{}/tree/{}/{}",
        request.repo, download.branch, relative_path
    ))
}

fn quote_frontmatter_value(value: &str) -> String {
    format!("\"{}\"", value.replace('\\', "\\\\").replace('"', "\\\""))
}

fn upsert_install_metadata(
    skill_dir: &Path,
    source_url: &str,
    market_source: Option<&str>,
    market_url: Option<&str>,
) -> Result<(), String> {
    let skill_md_path = skill_dir.join("SKILL.md");
    let content = fs::read_to_string(&skill_md_path)
        .map_err(|error| format!("Failed to read '{}': {}", skill_md_path.display(), error))?;

    let (mut frontmatter, body) = split_frontmatter(&content);
    upsert_frontmatter_key(
        &mut frontmatter,
        "source",
        &quote_frontmatter_value(source_url),
    );
    if let Some(value) = market_source.filter(|value| !value.trim().is_empty()) {
        upsert_frontmatter_key(
            &mut frontmatter,
            "source_market",
            &quote_frontmatter_value(value.trim()),
        );
    }
    if let Some(value) = market_url.filter(|value| !value.trim().is_empty()) {
        upsert_frontmatter_key(
            &mut frontmatter,
            "source_market_url",
            &quote_frontmatter_value(value.trim()),
        );
    }

    let mut output = String::from("---\n");
    for line in &frontmatter {
        output.push_str(line);
        output.push('\n');
    }
    output.push_str("---\n");
    output.push_str(&body);

    fs::write(&skill_md_path, output)
        .map_err(|error| format!("Failed to write '{}': {}", skill_md_path.display(), error))
}

fn split_frontmatter(content: &str) -> (Vec<String>, String) {
    if let Some(rest) = content.strip_prefix("---\n") {
        if let Some(end_index) = rest.find("\n---\n") {
            let frontmatter = rest[..end_index]
                .lines()
                .map(|line| line.to_string())
                .collect::<Vec<_>>();
            let body = rest[end_index + "\n---\n".len()..].to_string();
            return (frontmatter, body);
        }
    }

    (Vec::new(), content.to_string())
}

fn upsert_frontmatter_key(lines: &mut Vec<String>, key: &str, value: &str) {
    if let Some(line) = lines
        .iter_mut()
        .find(|line| line.trim_start().starts_with(&format!("{}:", key)))
    {
        *line = format!("{}: {}", key, value);
        return;
    }

    lines.push(format!("{}: {}", key, value));
}

fn resolve_skill_directory(
    repo_root: &Path,
    subdir: Option<&str>,
    skill_name: Option<&str>,
) -> Result<PathBuf, String> {
    if let Some(relative_subdir) = subdir {
        let candidate = repo_root.join(relative_subdir);
        if candidate.join("SKILL.md").exists() {
            return Ok(candidate);
        }
        return Err(format!(
            "The GitHub link points to '{}', but it is not a skill folder",
            relative_subdir
        ));
    }

    if repo_root.join("SKILL.md").exists() {
        return Ok(repo_root.to_path_buf());
    }

    let mut skill_dirs = collect_skill_directories(repo_root);
    if let Some(name) = skill_name {
        if let Some(exact_skills_dir_match) = skill_dirs.iter().find(|path| {
            path.file_name()
                .and_then(|value| value.to_str())
                .map(|value| value == name && is_under_skills_dir(path))
                .unwrap_or(false)
        }) {
            return Ok(exact_skills_dir_match.clone());
        }

        if let Some(exact_name_match) = skill_dirs.iter().find(|path| {
            path.file_name()
                .and_then(|value| value.to_str())
                .map(|value| value == name)
                .unwrap_or(false)
        }) {
            return Ok(exact_name_match.clone());
        }

        if let Some(frontmatter_match) = skill_dirs.iter().find(|path| {
            read_skill_name(path)
                .map(|value| value == name)
                .unwrap_or(false)
        }) {
            return Ok(frontmatter_match.clone());
        }

        return Err(format!(
            "Could not find a skill named '{}' in this repository",
            name
        ));
    }

    match skill_dirs.len() {
        0 => Err(String::from("No SKILL.md folders were found in this repository")),
        1 => Ok(skill_dirs.remove(0)),
        _ => Err(String::from(
            "This repository contains multiple skills. Use a GitHub tree URL or provide a skill name.",
        )),
    }
}

fn collect_skill_directories(root: &Path) -> Vec<PathBuf> {
    WalkDir::new(root)
        .into_iter()
        .filter_map(Result::ok)
        .filter(|entry| entry.file_type().is_file() && entry.file_name() == "SKILL.md")
        .filter_map(|entry| entry.path().parent().map(Path::to_path_buf))
        .collect()
}

fn is_under_skills_dir(path: &Path) -> bool {
    path.components().any(|component| match component {
        Component::Normal(value) => value == "skills",
        _ => false,
    })
}

fn read_skill_name(path: &Path) -> Option<String> {
    let content = fs::read_to_string(path.join("SKILL.md")).ok()?;
    let mut lines = content.lines();
    if lines.next().map(str::trim) != Some("---") {
        return None;
    }

    for line in lines {
        let trimmed = line.trim();
        if trimmed == "---" {
            break;
        }
        let (key, value) = trimmed.split_once(':')?;
        if key.trim() == "name" {
            return Some(
                value
                    .trim()
                    .trim_matches('"')
                    .trim_matches('\'')
                    .to_string(),
            );
        }
    }

    None
}

fn temp_dir(label: &str) -> PathBuf {
    std::env::temp_dir().join(format!(
        "skill-gate-market-{}-{}",
        label,
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos()
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn market_parse_github_root_url() {
        let parsed = parse_github_install_request("https://github.com/huggingface/skills")
            .expect("should parse repo root url");

        assert_eq!(
            parsed,
            GitHubInstallRequest {
                repo: String::from("huggingface/skills"),
                branch: None,
                subdir: None,
            }
        );
    }

    #[test]
    fn market_parse_github_tree_url() {
        let parsed = parse_github_install_request(
            "https://github.com/huggingface/skills/tree/main/skills/hf-cli",
        )
        .expect("should parse repo tree url");

        assert_eq!(
            parsed,
            GitHubInstallRequest {
                repo: String::from("huggingface/skills"),
                branch: Some(String::from("main")),
                subdir: Some(String::from("skills/hf-cli")),
            }
        );
    }

    #[test]
    fn market_resolve_explicit_subdir() {
        let root = temp_dir("explicit");
        let skill_dir = root.join("skills").join("hf-cli");
        fs::create_dir_all(&skill_dir).unwrap();
        fs::write(skill_dir.join("SKILL.md"), "# hf-cli").unwrap();

        let resolved = resolve_skill_directory(&root, Some("skills/hf-cli"), None)
            .expect("should resolve explicit subdir");

        assert_eq!(resolved, skill_dir);
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn market_resolve_named_skill_recursively() {
        let root = temp_dir("named");
        let skill_dir = root.join("packages").join("prompt-engineering");
        fs::create_dir_all(&skill_dir).unwrap();
        fs::write(
            skill_dir.join("SKILL.md"),
            "---\nname: prompt-engineering\ndescription: test\n---\n",
        )
        .unwrap();

        let resolved = resolve_skill_directory(&root, None, Some("prompt-engineering"))
            .expect("should resolve recursive named skill");

        assert_eq!(resolved, skill_dir);
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn market_upserts_source_metadata_into_frontmatter() {
        let root = temp_dir("metadata");
        let skill_dir = root.join("skill");
        fs::create_dir_all(&skill_dir).unwrap();
        fs::write(
            skill_dir.join("SKILL.md"),
            "---\nname: demo\ndescription: test\n---\nbody\n",
        )
        .unwrap();

        upsert_install_metadata(
            &skill_dir,
            "https://github.com/example/skills/tree/main/skills/demo",
            Some("skills.sh"),
            Some("https://skills.sh/example/skills/demo"),
        )
        .expect("should write source metadata");

        let content = fs::read_to_string(skill_dir.join("SKILL.md")).unwrap();
        assert!(
            content.contains("source: \"https://github.com/example/skills/tree/main/skills/demo\"")
        );
        assert!(content.contains("source_market: \"skills.sh\""));
        assert!(content.contains("source_market_url: \"https://skills.sh/example/skills/demo\""));
        let _ = fs::remove_dir_all(root);
    }
}
