import type { StatusCounts, StatusFilter } from "./skillFilters";
import type { SkillInfo } from "./skillTypes";

interface SkillGroup {
  skills: SkillInfo[];
  firstIndex: number;
}

interface SkillPresentation {
  skills: SkillInfo[];
  statusCounts: StatusCounts;
}

function withDisplaySymlink(skill: SkillInfo, isSymlink: boolean): SkillInfo {
  return skill.is_symlink === isSymlink ? skill : { ...skill, is_symlink: isSymlink };
}

function getFallbackStatusCounts(skills: SkillInfo[]): StatusCounts {
  return {
    all: skills.length,
    symlinked: skills.filter((skill) => skill.is_symlink).length,
    local: skills.filter((skill) => !skill.is_symlink).length,
    updates: skills.filter(
      (skill) => skill.update_status === "update_available",
    ).length,
  };
}

function chooseDefaultRepresentative(skills: SkillInfo[]): SkillInfo {
  return (
    skills.find(
      (skill) => skill.agent === "Shared Library" && !skill.is_symlink,
    ) ??
    skills.find((skill) => !skill.is_symlink) ??
    skills[0]
  );
}

function isSharedBackedGroup(skills: SkillInfo[]): boolean {
  return skills.some((skill) => skill.is_symlink);
}

function presentGroup(skills: SkillInfo[]): SkillInfo {
  return withDisplaySymlink(
    chooseDefaultRepresentative(skills),
    isSharedBackedGroup(skills),
  );
}

function presentSharedLibraryGroup(skills: SkillInfo[]): SkillInfo {
  const sharedSkill = skills.find((skill) => skill.agent === "Shared Library");
  return withDisplaySymlink(
    sharedSkill ?? chooseDefaultRepresentative(skills),
    isSharedBackedGroup(skills),
  );
}

function buildGroups(skills: SkillInfo[]): SkillGroup[] {
  const groups = new Map<string, SkillGroup>();

  skills.forEach((skill, index) => {
    const key = skill.canonical_path || skill.path;
    const existing = groups.get(key);
    if (existing) {
      existing.skills.push(skill);
      return;
    }

    groups.set(key, {
      skills: [skill],
      firstIndex: index,
    });
  });

  return Array.from(groups.values()).sort((left, right) => left.firstIndex - right.firstIndex);
}

function filterSkillsByStatus(
  skills: SkillInfo[],
  statusFilter: StatusFilter,
): SkillInfo[] {
  switch (statusFilter) {
    case "symlinked":
      return skills.filter((skill) => skill.is_symlink);
    case "local":
      return skills.filter((skill) => !skill.is_symlink);
    case "updates":
      return skills.filter((skill) => skill.update_status === "update_available");
    default:
      return skills;
  }
}

export function buildSkillPresentation(
  skills: SkillInfo[],
  agentFilter: string,
  statusFilter: StatusFilter = "all",
): SkillPresentation {
  const groups = buildGroups(skills);

  if (agentFilter === "Shared Library") {
    const presentedSharedSkills = groups
      .filter((group) =>
        group.skills.some((skill) => skill.agent === "Shared Library"),
      )
      .map((group) => presentSharedLibraryGroup(group.skills));
    const statusCounts = getFallbackStatusCounts(presentedSharedSkills);

    return {
      skills: filterSkillsByStatus(presentedSharedSkills, statusFilter),
      statusCounts,
    };
  }

  const agentScopedSkills =
    agentFilter === "all"
      ? skills
      : skills.filter((skill) => skill.agent === agentFilter);

  if (agentFilter !== "all") {
    const presentedAgentSkills = agentScopedSkills;
    const statusCounts = getFallbackStatusCounts(presentedAgentSkills);
    return {
      skills: filterSkillsByStatus(presentedAgentSkills, statusFilter),
      statusCounts,
    };
  }

  const presentedAll = groups.map((group) => presentGroup(group.skills));
  const presentedSymlinked = groups
    .filter((group) => isSharedBackedGroup(group.skills))
    .map((group) => presentGroup(group.skills));
  const presentedLocal = groups
    .filter((group) => !isSharedBackedGroup(group.skills))
    .map((group) => presentGroup(group.skills));
  const presentedUpdates = groups
    .filter((group) =>
      group.skills.some((skill) => skill.update_status === "update_available"),
    )
    .map((group) => presentGroup(group.skills));

  const statusCounts: StatusCounts = {
    all: presentedAll.length,
    symlinked: presentedSymlinked.length,
    local: presentedLocal.length,
    updates: presentedUpdates.length,
  };

  switch (statusFilter) {
    case "symlinked":
      return { skills: presentedSymlinked, statusCounts };
    case "local":
      return { skills: presentedLocal, statusCounts };
    case "updates":
      return { skills: presentedUpdates, statusCounts };
    default:
      return { skills: presentedAll, statusCounts };
  }
}
