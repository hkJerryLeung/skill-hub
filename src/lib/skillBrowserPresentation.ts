import { buildSkillPresentation } from "./skillListPresentation.ts";
import type { StatusFilter } from "./skillFilters.ts";
import type { SkillInfo } from "./skillTypes.ts";

export function buildBrowserSkillPresentation(
  skills: SkillInfo[],
  agentFilter: string,
  search: string,
  statusFilter: StatusFilter,
) {
  const normalizedSearch = search.trim().toLowerCase();
  const searchScopedSkills =
    normalizedSearch === ""
      ? skills
      : skills.filter(
          (skill) =>
            skill.name.toLowerCase().includes(normalizedSearch) ||
            skill.description.toLowerCase().includes(normalizedSearch),
        );

  return buildSkillPresentation(searchScopedSkills, agentFilter, statusFilter);
}
