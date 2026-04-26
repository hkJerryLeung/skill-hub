export interface SkillInfo {
  name: string;
  description: string;
  path: string;
  canonical_path: string;
  agent: string;
  is_symlink: boolean;
  category: string | null;
  category_assignment_mode: "auto" | "manual" | null;
  category_confidence: number | null;
  category_classified_at: string | null;
  version: string | null;
  source: string | null;
}
