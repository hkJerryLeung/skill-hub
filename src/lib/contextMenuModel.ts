import type { AgentFilter, DiscoverView } from "../components/Sidebar/Sidebar";
import type { AgentTarget } from "./appSettings";

type SkillLike = {
  name: string;
  path: string;
  canonical_path: string;
  agent: string;
  is_symlink: boolean;
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
  danger: ContextMenuItemModel[];
}

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
}: {
  selectedSkills: SkillLike[];
}): SkillMenuModel => {
  const isSingle = selectedSkills.length === 1;
  const first = selectedSkills[0];

  return {
    primary: isSingle
      ? [
          { id: "open-details", label: "Open Details" },
          { id: "reveal", label: "Reveal in Finder" },
        ]
      : [],
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
