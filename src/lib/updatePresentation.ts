import type { SkillInfo, UpdateCapability, UpdateStatus } from "./skillTypes";

export function getVersionLabel(skill: Pick<SkillInfo, "version">): string {
  return skill.version ? `v${skill.version}` : "Unversioned";
}

export function getUpdateStatusLabel(
  status: UpdateStatus,
  capability: UpdateCapability,
): string | null {
  switch (status) {
    case "update_available":
      return capability === "external" ? "Manual Update" : "Update Available";
    case "up_to_date":
      return "Up To Date";
    case "manual_only":
      return capability === "external" ? "Manual Source" : "Manual Only";
    case "unversioned":
      return "Unversioned";
    case "error":
      return "Check Failed";
    default:
      return null;
  }
}

export function getCardStatusLabel(
  skill: Pick<SkillInfo, "update_status" | "update_capability">,
): string | null {
  if (skill.update_status !== "update_available") {
    return null;
  }

  return getUpdateStatusLabel(skill.update_status, skill.update_capability);
}

export function canTriggerInlineUpdate(
  skill: Pick<SkillInfo, "update_status" | "update_capability">,
): boolean {
  return (
    skill.update_capability === "github" &&
    skill.update_status === "update_available"
  );
}

export function getInlineUpdateLabel(
  skill: Pick<
    SkillInfo,
    "update_status" | "update_capability" | "upstream_version"
  >,
): string | null {
  if (!canTriggerInlineUpdate(skill)) {
    return null;
  }

  return skill.upstream_version
    ? `Update to v${skill.upstream_version}`
    : "Update Available";
}

export function formatLastChecked(lastCheckedAt: string | null): string {
  if (!lastCheckedAt) {
    return "Never";
  }

  const seconds = Number(lastCheckedAt);
  if (Number.isNaN(seconds)) {
    return lastCheckedAt;
  }

  return new Date(seconds * 1000).toLocaleString();
}

export function canAutoUpdate(skill: Pick<SkillInfo, "update_capability">): boolean {
  return skill.update_capability === "github";
}
