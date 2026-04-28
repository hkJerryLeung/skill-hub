use reqwest::blocking::Client;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::time::Duration;

const SCOUT_SYSTEM_PROMPT: &str = "You are AI Install inside Skill Gate. Help the user find existing GitHub-hosted AI agent skills. Return strict JSON only. The JSON shape is {\"message\":\"short answer\",\"recommendations\":[{\"title\":\"skill title\",\"github_url\":\"https://github.com/owner/repo or tree URL\",\"skill_name\":\"optional folder or skill id\",\"reason\":\"why this fits\",\"confidence\":0.0}]}. Recommend only GitHub URLs. If you are unsure, say so in message and return fewer recommendations.";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct LocalSkillModel {
    pub id: String,
    pub provider: String,
    pub provider_label: String,
    pub base_url: String,
    pub model: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct SkillScoutRequest {
    pub provider: String,
    pub base_url: String,
    pub model: String,
    pub prompt: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct SkillScoutResponse {
    pub message: String,
    pub recommendations: Vec<SkillScoutRecommendation>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct SkillScoutRecommendation {
    pub title: String,
    pub github_url: String,
    #[serde(default)]
    pub skill_name: Option<String>,
    pub reason: String,
    #[serde(default)]
    pub confidence: Option<f64>,
}

#[derive(Debug, Deserialize)]
struct OllamaTagsResponse {
    #[serde(default)]
    models: Vec<OllamaModel>,
}

#[derive(Debug, Deserialize)]
struct OllamaModel {
    name: String,
}

#[derive(Debug, Deserialize)]
struct OpenAiModelsResponse {
    #[serde(default)]
    data: Vec<OpenAiModel>,
}

#[derive(Debug, Deserialize)]
struct OpenAiModel {
    id: String,
}

#[derive(Debug, Deserialize)]
struct OpenAiChatResponse {
    choices: Vec<OpenAiChoice>,
}

#[derive(Debug, Deserialize)]
struct OpenAiChoice {
    message: OpenAiMessage,
}

#[derive(Debug, Deserialize)]
struct OpenAiMessage {
    content: Value,
}

#[derive(Debug, Deserialize)]
struct OllamaChatResponse {
    message: OllamaChatMessage,
}

#[derive(Debug, Deserialize)]
struct OllamaChatMessage {
    content: String,
}

pub fn detect_local_skill_models() -> Vec<LocalSkillModel> {
    let Ok(client) = Client::builder()
        .timeout(Duration::from_millis(700))
        .build()
    else {
        return Vec::new();
    };

    let mut models = Vec::new();
    if let Ok(mut detected) = detect_ollama_models(&client, "http://localhost:11434") {
        models.append(&mut detected);
    }
    if let Ok(mut detected) = detect_openai_models(&client, "http://localhost:1234/v1", "LM Studio")
    {
        models.append(&mut detected);
    }
    if let Ok(mut detected) =
        detect_openai_models(&client, "http://localhost:8080/v1", "OpenAI-compatible")
    {
        models.append(&mut detected);
    }

    models.sort_by(|left, right| {
        left.provider_label
            .cmp(&right.provider_label)
            .then(left.model.cmp(&right.model))
    });
    models.dedup_by(|left, right| left.id == right.id);
    models
}

pub fn chat_with_local_skill_scout(
    request: SkillScoutRequest,
) -> Result<SkillScoutResponse, String> {
    let prompt = request.prompt.trim();
    if prompt.is_empty() {
        return Err(String::from("Ask AI Install what kind of skill you need"));
    }
    if request.model.trim().is_empty() {
        return Err(String::from("Choose or enter a local model first"));
    }
    if request.base_url.trim().is_empty() {
        return Err(String::from("Local model base URL cannot be empty"));
    }

    let client = Client::builder()
        .timeout(Duration::from_secs(90))
        .build()
        .map_err(|error| format!("Failed to create local model client: {}", error))?;

    let content = match request.provider.as_str() {
        "ollama" => chat_with_ollama(&client, &request, prompt),
        "openai_compatible" => chat_with_openai_compatible(&client, &request, prompt),
        other => Err(format!("Unsupported local model provider: {}", other)),
    }?;

    parse_skill_scout_response(&content)
}

pub fn parse_skill_scout_response(raw: &str) -> Result<SkillScoutResponse, String> {
    let json_payload = extract_json_payload(raw)?;
    let mut parsed: SkillScoutResponse = serde_json::from_str(&json_payload)
        .map_err(|error| format!("Failed to parse skill scout JSON: {}", error))?;

    parsed.message = parsed.message.trim().to_string();
    parsed.recommendations = parsed
        .recommendations
        .into_iter()
        .map(normalize_recommendation)
        .filter(|recommendation| recommendation.github_url.starts_with("https://github.com/"))
        .collect();

    Ok(parsed)
}

fn detect_ollama_models(client: &Client, base_url: &str) -> Result<Vec<LocalSkillModel>, String> {
    let response = client
        .get(format!("{}/api/tags", base_url.trim_end_matches('/')))
        .send()
        .map_err(|error| format!("Failed to contact Ollama: {}", error))?
        .error_for_status()
        .map_err(|error| format!("Ollama returned an error: {}", error))?
        .json::<OllamaTagsResponse>()
        .map_err(|error| format!("Failed to parse Ollama models: {}", error))?;

    Ok(response
        .models
        .into_iter()
        .filter(|model| !model.name.trim().is_empty())
        .map(|model| LocalSkillModel {
            id: format!("ollama:{}:{}", base_url, model.name),
            provider: String::from("ollama"),
            provider_label: String::from("Ollama"),
            base_url: base_url.to_string(),
            model: model.name,
        })
        .collect())
}

fn detect_openai_models(
    client: &Client,
    base_url: &str,
    provider_label: &str,
) -> Result<Vec<LocalSkillModel>, String> {
    let response = client
        .get(format!("{}/models", base_url.trim_end_matches('/')))
        .send()
        .map_err(|error| format!("Failed to contact {}: {}", provider_label, error))?
        .error_for_status()
        .map_err(|error| format!("{} returned an error: {}", provider_label, error))?
        .json::<OpenAiModelsResponse>()
        .map_err(|error| format!("Failed to parse {} models: {}", provider_label, error))?;

    Ok(response
        .data
        .into_iter()
        .filter(|model| !model.id.trim().is_empty())
        .map(|model| LocalSkillModel {
            id: format!("openai_compatible:{}:{}", base_url, model.id),
            provider: String::from("openai_compatible"),
            provider_label: provider_label.to_string(),
            base_url: base_url.to_string(),
            model: model.id,
        })
        .collect())
}

fn chat_with_openai_compatible(
    client: &Client,
    request: &SkillScoutRequest,
    prompt: &str,
) -> Result<String, String> {
    let response = client
        .post(format!(
            "{}/chat/completions",
            request.base_url.trim_end_matches('/')
        ))
        .json(&json!({
            "model": request.model.trim(),
            "temperature": 0.2,
            "messages": [
                { "role": "system", "content": SCOUT_SYSTEM_PROMPT },
                { "role": "user", "content": prompt }
            ]
        }))
        .send()
        .map_err(|error| format!("Failed to call local model: {}", error))?
        .error_for_status()
        .map_err(|error| format!("Local model returned an error: {}", error))?
        .json::<OpenAiChatResponse>()
        .map_err(|error| format!("Failed to parse local model response: {}", error))?;

    let message = response
        .choices
        .first()
        .ok_or_else(|| String::from("Local model response had no choices"))?
        .message
        .content
        .clone();

    extract_message_content(message)
}

fn chat_with_ollama(
    client: &Client,
    request: &SkillScoutRequest,
    prompt: &str,
) -> Result<String, String> {
    let response = client
        .post(format!(
            "{}/api/chat",
            request.base_url.trim_end_matches('/')
        ))
        .json(&json!({
            "model": request.model.trim(),
            "stream": false,
            "messages": [
                { "role": "system", "content": SCOUT_SYSTEM_PROMPT },
                { "role": "user", "content": prompt }
            ]
        }))
        .send()
        .map_err(|error| format!("Failed to call Ollama: {}", error))?
        .error_for_status()
        .map_err(|error| format!("Ollama returned an error: {}", error))?
        .json::<OllamaChatResponse>()
        .map_err(|error| format!("Failed to parse Ollama response: {}", error))?;

    Ok(response.message.content)
}

fn extract_message_content(content: Value) -> Result<String, String> {
    if let Some(text) = content.as_str() {
        return Ok(text.to_string());
    }

    if let Some(parts) = content.as_array() {
        let text = parts
            .iter()
            .filter_map(|part| part.get("text").and_then(Value::as_str))
            .collect::<Vec<_>>()
            .join("");
        if !text.trim().is_empty() {
            return Ok(text);
        }
    }

    Err(String::from(
        "Unsupported local model message content shape",
    ))
}

fn extract_json_payload(raw: &str) -> Result<String, String> {
    let trimmed = raw.trim();
    let without_fence = trimmed
        .strip_prefix("```json")
        .or_else(|| trimmed.strip_prefix("```"))
        .and_then(|value| value.trim().strip_suffix("```"))
        .map(str::trim)
        .unwrap_or(trimmed);

    if without_fence.starts_with('{') && without_fence.ends_with('}') {
        return Ok(without_fence.to_string());
    }

    let start = without_fence
        .find('{')
        .ok_or_else(|| String::from("AI Install response did not include JSON"))?;
    let end = without_fence
        .rfind('}')
        .ok_or_else(|| String::from("AI Install response did not include complete JSON"))?;

    Ok(without_fence[start..=end].to_string())
}

fn normalize_recommendation(
    mut recommendation: SkillScoutRecommendation,
) -> SkillScoutRecommendation {
    recommendation.title = recommendation.title.trim().to_string();
    recommendation.github_url = recommendation
        .github_url
        .trim()
        .trim_end_matches('/')
        .to_string();
    recommendation.reason = recommendation.reason.trim().to_string();
    recommendation.skill_name = recommendation.skill_name.and_then(|value| {
        let trimmed = value.trim().to_string();
        if trimmed.is_empty() {
            None
        } else {
            Some(trimmed)
        }
    });
    recommendation
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_plain_json_skill_scout_response() {
        let parsed = parse_skill_scout_response(
            r#"{
              "message": "I found two good candidates.",
              "recommendations": [
                {
                  "title": "PDF Toolkit",
                  "github_url": "https://github.com/example/skills/tree/main/pdf-toolkit",
                  "skill_name": "pdf-toolkit",
                  "reason": "Focused on PDF extraction and summarisation.",
                  "confidence": 0.86
                }
              ]
            }"#,
        )
        .unwrap();

        assert_eq!(parsed.message, "I found two good candidates.");
        assert_eq!(parsed.recommendations[0].title, "PDF Toolkit");
        assert_eq!(
            parsed.recommendations[0].github_url,
            "https://github.com/example/skills/tree/main/pdf-toolkit",
        );
    }

    #[test]
    fn parses_json_inside_markdown_fence() {
        let parsed = parse_skill_scout_response(
            r#"```json
            {
              "message": "Use this one.",
              "recommendations": [
                {
                  "title": "Research Helper",
                  "github_url": "https://github.com/example/research-helper",
                  "reason": "Good match for research workflows."
                }
              ]
            }
            ```"#,
        )
        .unwrap();

        assert_eq!(parsed.recommendations[0].title, "Research Helper");
        assert_eq!(parsed.recommendations[0].skill_name, None);
        assert_eq!(parsed.recommendations[0].confidence, None);
    }
}
