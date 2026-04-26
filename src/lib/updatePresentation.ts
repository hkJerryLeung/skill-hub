import type { SkillInfo } from "./skillTypes";

export function getVersionLabel(skill: Pick<SkillInfo, "version">): string {
  return skill.version ? `v${skill.version}` : "Unversioned";
}
