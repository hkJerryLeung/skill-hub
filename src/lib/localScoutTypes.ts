export interface LocalSkillModel {
  id: string;
  provider: "ollama" | "openai_compatible";
  provider_label: string;
  base_url: string;
  model: string;
}

export interface SkillScoutRecommendation {
  title: string;
  github_url: string;
  skill_name: string | null;
  reason: string;
  confidence: number | null;
}

export interface SkillScoutResponse {
  message: string;
  recommendations: SkillScoutRecommendation[];
}
