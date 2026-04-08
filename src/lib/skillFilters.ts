import type { SkillInfo } from "./skillTypes";

export type StatusFilter = "all" | "symlinked" | "local" | "updates";

export interface StatusCounts {
  all: number;
  symlinked: number;
  local: number;
  updates: number;
}

export function toggleStatusFilter(
  current: StatusFilter,
  next: StatusFilter,
): StatusFilter {
  return current === next ? "all" : next;
}

export function applyStatusFilter(
  skills: SkillInfo[],
  filter: StatusFilter,
): SkillInfo[] {
  switch (filter) {
    case "symlinked":
      return skills.filter((skill) => skill.is_symlink);
    case "local":
      return skills.filter((skill) => !skill.is_symlink);
    case "updates":
      return skills.filter(
        (skill) => skill.update_status === "update_available",
      );
    default:
      return skills;
  }
}

export function getStatusCounts(skills: SkillInfo[]): StatusCounts {
  return {
    all: skills.length,
    symlinked: skills.filter((skill) => skill.is_symlink).length,
    local: skills.filter((skill) => !skill.is_symlink).length,
    updates: skills.filter(
      (skill) => skill.update_status === "update_available",
    ).length,
  };
}
