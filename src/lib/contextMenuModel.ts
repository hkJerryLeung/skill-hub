import type { AgentFilter, DiscoverView } from "../components/Sidebar/Sidebar";
import type { AgentTarget } from "./appSettings";

type SkillLike = {
  name: string;
  path: string;
  canonical_path: string;
  agent: string;
  is_symlink: boolean;
  update_capability: string;
  update_status: string;
};

export type ContextMenuTone = "default" | "danger";

export interface ContextMenuItemModel {
  id: string;
  label: string;
  disabled?: boolean;
  tone?: ContextMenuTone;
  target?: string;
}

export interface SkillMenuModel {
  primary: ContextMenuItemModel[];
  install: ContextMenuItemModel[];
  move: ContextMenuItemModel[];
  danger: ContextMenuItemModel[];
}

const buildAgentTargetActions = ({
  prefix,
  verb,
  selectedSkills,
  targets,
}: {
  prefix: string;
  verb: string;
  selectedSkills: SkillLike[];
  targets: AgentTarget[];
}): ContextMenuItemModel[] => {
  const count = selectedSkills.length;
  const isBatch = count > 1;

  return targets
    .filter((target) =>
      !selectedSkills.every((skill) => skill.agent === target.name),
    )
    .map((target) => ({
      id: `${prefix}-${target.name}`,
      label: isBatch
        ? `${verb} ${count} selected to ${target.name}`
        : `${verb} to ${target.name}`,
      target: target.name,
    }));
};

export const buildSidebarAgentMenuItems = ({
  agent,
  targets,
}: {
  agent: AgentFilter;
  targets: AgentTarget[];
}): ContextMenuItemModel[] => {
  const target = targets.find((candidate) => candidate.name === agent);

  return [
    { id: "open", label: `Open ${agent}` },
    { id: "reveal", label: "Reveal Folder", disabled: !target },
    { id: "rescan", label: "Rescan Skills" },
    { id: "check-updates", label: "Check Updates" },
    { id: "update-all", label: "Update All" },
    ...(agent === "Shared Library"
      ? [{ id: "auto-categorize", label: "Auto Categorize" }]
      : []),
  ];
};

export const buildDiscoverMenuItems = ({
  view,
}: {
  view: DiscoverView;
}): ContextMenuItemModel[] => [
  { id: "open", label: `Open ${view}` },
  { id: "refresh-source", label: "Refresh Source" },
];

export const buildSettingsMenuItems = (): ContextMenuItemModel[] => [
  { id: "open-settings", label: "Open Settings" },
  { id: "load-defaults", label: "Load Defaults Into Form" },
];

export const buildSkillMenuItems = ({
  selectedSkills,
  targets,
}: {
  selectedSkills: SkillLike[];
  targets: AgentTarget[];
}): SkillMenuModel => {
  const isSingle = selectedSkills.length === 1;
  const first = selectedSkills[0];

  return {
    primary: isSingle
      ? [
          { id: "open-details", label: "Open Details" },
          { id: "reveal", label: "Reveal in Finder" },
          { id: "check-update", label: "Check Update" },
          {
            id: "update-skill",
            label: "Update Skill",
            disabled:
              first.update_capability !== "github" ||
              first.update_status !== "update_available",
          },
        ]
      : [],
    install: isSingle
      ? buildAgentTargetActions({
          prefix: "install",
          verb: "Install",
          selectedSkills,
          targets,
        })
      : [],
    move: buildAgentTargetActions({
      prefix: "move",
      verb: "Move",
      selectedSkills,
      targets,
    }),
    danger: isSingle
      ? [
          {
            id: "remove",
            label: `Remove from ${first.agent}`,
            tone: "danger",
          },
        ]
      : [],
  };
};
