import type { StatusCounts, StatusFilter } from "./skillFilters";
import type { SkillInfo } from "./skillTypes";
import {
  DEFAULT_SHARED_CATEGORY_SLUG,
  getSharedLibraryCategoryLabel,
  SHARED_LIBRARY_CATEGORIES,
} from "./sharedLibraryCategories.ts";

interface SkillGroup {
  skills: SkillInfo[];
  firstIndex: number;
}

export interface SharedCategoryPresentation {
  slug: string;
  label: string;
  skills: SkillInfo[];
}

export interface SharedCategoryCount {
  slug: string;
  label: string;
  count: number;
}

interface SkillPresentation {
  skills: SkillInfo[];
  statusCounts: StatusCounts;
  sharedCategoryGroups: SharedCategoryPresentation[];
  sharedCategoryCounts: SharedCategoryCount[];
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

function getSharedCategorySlug(skill: SkillInfo): string {
  return skill.category ?? DEFAULT_SHARED_CATEGORY_SLUG;
}

function getSharedCategoryOrder(slug: string): number {
  const index = SHARED_LIBRARY_CATEGORIES.findIndex((category) => category.slug === slug);
  return index === -1 ? SHARED_LIBRARY_CATEGORIES.length : index;
}

function buildSharedCategoryGroups(skills: SkillInfo[]): SharedCategoryPresentation[] {
  const groups = new Map<string, SkillInfo[]>();

  skills.forEach((skill) => {
    const slug = getSharedCategorySlug(skill);
    const bucket = groups.get(slug);
    if (bucket) {
      bucket.push(skill);
      return;
    }

    groups.set(slug, [skill]);
  });

  return Array.from(groups.entries())
    .sort((left, right) => getSharedCategoryOrder(left[0]) - getSharedCategoryOrder(right[0]))
    .map(([slug, groupedSkills]) => ({
      slug,
      label: getSharedLibraryCategoryLabel(slug) ?? slug,
      skills: groupedSkills,
    }));
}

function buildSharedCategoryCounts(skills: SkillInfo[]): SharedCategoryCount[] {
  const counts = new Map<string, number>();

  skills.forEach((skill) => {
    const slug = getSharedCategorySlug(skill);
    counts.set(slug, (counts.get(slug) ?? 0) + 1);
  });

  return SHARED_LIBRARY_CATEGORIES.map((category) => ({
    slug: category.slug,
    label: category.label,
    count: counts.get(category.slug) ?? 0,
  }));
}

export function buildSkillPresentation(
  skills: SkillInfo[],
  agentFilter: string,
  statusFilter: StatusFilter = "all",
  selectedSharedCategories: ReadonlySet<string> = new Set<string>(),
): SkillPresentation {
  const groups = buildGroups(skills);
  const emptySharedCategoryGroups: SharedCategoryPresentation[] = [];
  const emptySharedCategoryCounts: SharedCategoryCount[] = [];

  if (agentFilter === "Shared Library") {
    const presentedSharedSkills = groups
      .filter((group) =>
        group.skills.some((skill) => skill.agent === "Shared Library"),
      )
      .map((group) => presentSharedLibraryGroup(group.skills));
    const statusCounts = getFallbackStatusCounts(presentedSharedSkills);
    const statusFilteredSharedSkills = filterSkillsByStatus(
      presentedSharedSkills,
      statusFilter,
    );
    const sharedCategoryCounts = buildSharedCategoryCounts(statusFilteredSharedSkills);
    const sharedCategoryGroups = buildSharedCategoryGroups(statusFilteredSharedSkills);
    const visibleSharedCategoryGroups = sharedCategoryGroups.filter(
      (group) =>
        selectedSharedCategories.size === 0 ||
        selectedSharedCategories.has(group.slug),
    );

    return {
      skills: visibleSharedCategoryGroups.flatMap((group) => group.skills),
      statusCounts,
      sharedCategoryGroups: visibleSharedCategoryGroups,
      sharedCategoryCounts,
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
      sharedCategoryGroups: emptySharedCategoryGroups,
      sharedCategoryCounts: emptySharedCategoryCounts,
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
      return {
        skills: presentedSymlinked,
        statusCounts,
        sharedCategoryGroups: emptySharedCategoryGroups,
        sharedCategoryCounts: emptySharedCategoryCounts,
      };
    case "local":
      return {
        skills: presentedLocal,
        statusCounts,
        sharedCategoryGroups: emptySharedCategoryGroups,
        sharedCategoryCounts: emptySharedCategoryCounts,
      };
    case "updates":
      return {
        skills: presentedUpdates,
        statusCounts,
        sharedCategoryGroups: emptySharedCategoryGroups,
        sharedCategoryCounts: emptySharedCategoryCounts,
      };
    default:
      return {
        skills: presentedAll,
        statusCounts,
        sharedCategoryGroups: emptySharedCategoryGroups,
        sharedCategoryCounts: emptySharedCategoryCounts,
      };
  }
}
