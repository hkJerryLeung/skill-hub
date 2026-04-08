use crate::settings::AppSettings;
use reqwest::blocking::Client;
use serde::Deserialize;
use serde_json::{json, Value};
use std::fs;
use std::path::Path;

const SYSTEM_PROMPT: &str = "You categorize AI agent skills. Return strict JSON with keys category_slug, confidence, and reason. category_slug must be one of: document-processing, development-code-tools, data-analysis, business-marketing, communication-writing, creative-media, productivity-organization, collaboration-project-management, security-systems, uncategorized.";

#[derive(Debug, Clone, PartialEq)]
pub struct ClassificationResult {
    pub category_slug: String,
    pub confidence: Option<f64>,
    pub reason: Option<String>,
}

#[derive(Debug, Deserialize)]
struct RawClassificationResult {
    category_slug: String,
    confidence: Option<f64>,
    reason: Option<String>,
}

pub fn parse_chat_completion_response(response: &str) -> Result<ClassificationResult, String> {
    let payload: Value = serde_json::from_str(response)
        .map_err(|error| format!("Failed to parse chat completion response: {}", error))?;
    let content = payload
        .get("choices")
        .and_then(Value::as_array)
        .and_then(|choices| choices.first())
        .and_then(|choice| choice.get("message"))
        .and_then(|message| message.get("content"))
        .ok_or_else(|| {
            String::from("Chat completion response missing choices[0].message.content")
        })?;

    let text = if let Some(text) = content.as_str() {
        text.to_string()
    } else if let Some(parts) = content.as_array() {
        parts
            .iter()
            .filter_map(|part| part.get("text").and_then(Value::as_str))
            .collect::<String>()
    } else {
        return Err(String::from(
            "Unsupported chat completion message content shape",
        ));
    };

    let parsed: RawClassificationResult = serde_json::from_str(&text)
        .map_err(|error| format!("Failed to parse classifier JSON content: {}", error))?;

    Ok(ClassificationResult {
        category_slug: parsed.category_slug,
        confidence: parsed.confidence,
        reason: parsed.reason,
    })
}

fn read_bounded_file(path: &Path, limit: usize) -> Option<String> {
    let content = fs::read_to_string(path).ok()?;
    Some(content.chars().take(limit).collect())
}

fn build_skill_prompt(skill_dir: &Path) -> String {
    let skill_md = read_bounded_file(&skill_dir.join("SKILL.md"), 6_000).unwrap_or_default();
    let readme = read_bounded_file(&skill_dir.join("README.md"), 2_000).unwrap_or_default();
    let root_files = fs::read_dir(skill_dir)
        .ok()
        .into_iter()
        .flat_map(|entries| entries.flatten())
        .map(|entry| entry.file_name().to_string_lossy().to_string())
        .collect::<Vec<_>>()
        .join(", ");

    format!(
        "Skill folder: {}\nRoot files: {}\n\nSKILL.md:\n{}\n\nREADME.md:\n{}",
        skill_dir.display(),
        root_files,
        skill_md,
        readme
    )
}

pub fn categorize_skill_directory(
    skill_dir: &Path,
    settings: &AppSettings,
) -> Result<ClassificationResult, String> {
    if !settings.categorization_enabled {
        return Ok(ClassificationResult {
            category_slug: String::from("uncategorized"),
            confidence: None,
            reason: Some(String::from("Categorization disabled")),
        });
    }

    if settings.categorization_base_url.trim().is_empty()
        || settings.categorization_model.trim().is_empty()
    {
        return Ok(ClassificationResult {
            category_slug: String::from("uncategorized"),
            confidence: None,
            reason: Some(String::from("Categorization provider not configured")),
        });
    }

    let url = format!(
        "{}/chat/completions",
        settings.categorization_base_url.trim_end_matches('/')
    );
    let user_prompt = build_skill_prompt(skill_dir);
    let client = Client::new();
    let mut request = client.post(url).json(&json!({
        "model": settings.categorization_model,
        "temperature": 0,
        "messages": [
            { "role": "system", "content": SYSTEM_PROMPT },
            { "role": "user", "content": user_prompt }
        ]
    }));

    if !settings.categorization_api_key.trim().is_empty() {
        request = request.bearer_auth(settings.categorization_api_key.trim());
    }

    let response_text = request
        .send()
        .map_err(|error| format!("Failed to call categorization provider: {}", error))?
        .error_for_status()
        .map_err(|error| format!("Categorization provider returned an error: {}", error))?
        .text()
        .map_err(|error| format!("Failed to read categorization response: {}", error))?;

    let parsed = parse_chat_completion_response(&response_text)?;
    if parsed.confidence.unwrap_or(0.0) < settings.categorization_confidence_threshold {
        return Ok(ClassificationResult {
            category_slug: String::from("uncategorized"),
            confidence: parsed.confidence,
            reason: parsed.reason,
        });
    }

    Ok(parsed)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_openai_style_chat_completion_content() {
        let response = r#"{
          "choices": [
            {
              "message": {
                "content": "{\"category_slug\":\"data-analysis\",\"confidence\":0.91,\"reason\":\"Focuses on analysis workflows.\"}"
              }
            }
          ]
        }"#;

        let parsed = parse_chat_completion_response(response).unwrap();
        assert_eq!(parsed.category_slug, "data-analysis");
        assert_eq!(parsed.confidence, Some(0.91));
        assert_eq!(
            parsed.reason.as_deref(),
            Some("Focuses on analysis workflows.")
        );
    }
}
