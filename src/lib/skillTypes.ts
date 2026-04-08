export type UpdateCapability = "github" | "external" | "manual";

export type UpdateStatus =
  | "unknown"
  | "up_to_date"
  | "update_available"
  | "unversioned"
  | "manual_only"
  | "error";

export interface SkillInfo {
  name: string;
  description: string;
  path: string;
  canonical_path: string;
  agent: string;
  is_symlink: boolean;
  category: string | null;
  version: string | null;
  source: string | null;
  update_capability: UpdateCapability;
  update_status: UpdateStatus;
  upstream_version: string | null;
  last_checked_at: string | null;
}
