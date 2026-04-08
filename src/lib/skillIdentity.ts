interface SkillIdentity {
  path: string;
}

export function getSkillId(skill: SkillIdentity): string {
  return skill.path;
}

interface InstalledSkillMatch {
  name: string;
  description: string;
  canonical_path: string;
  source: string | null;
  version: string | null;
}

export function matchesInstalledSkill(
  reference: InstalledSkillMatch,
  candidate: InstalledSkillMatch,
): boolean {
  if (reference.canonical_path === candidate.canonical_path) {
    return true;
  }

  return (
    reference.name === candidate.name &&
    reference.description === candidate.description &&
    reference.source === candidate.source &&
    reference.version === candidate.version
  );
}
