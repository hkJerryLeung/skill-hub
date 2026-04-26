use skill_gate_lib::local_scout::{
    parse_skill_scout_response, SkillScoutRecommendation, SkillScoutResponse,
};

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

    assert_eq!(
        parsed,
        SkillScoutResponse {
            message: String::from("I found two good candidates."),
            recommendations: vec![SkillScoutRecommendation {
                title: String::from("PDF Toolkit"),
                github_url: String::from("https://github.com/example/skills/tree/main/pdf-toolkit",),
                skill_name: Some(String::from("pdf-toolkit")),
                reason: String::from("Focused on PDF extraction and summarisation."),
                confidence: Some(0.86),
            }],
        },
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
