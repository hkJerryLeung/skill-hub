import React from 'react';
import {
  AllSkillsIcon,
  SharedLibraryIcon,
  ClaudeIcon,
  GeminiIcon,
  OpenAIIcon,
  SettingsIcon,
  DownloadIcon,
  GlobeIcon,
  GithubIcon,
} from '../Icons/Icons';
import { resolveSidebarDropTargetKey } from '../../lib/dragDropState';
import './Sidebar.css';

export type AgentFilter = "all" | "Claude Code" | "Antigravity" | "Codex" | "Shared Library";
export type DiscoverView = "huggingface" | "skills.sh" | "skillsmp.com" | "Install via GitHub";
export type SidebarItem = AgentFilter | DiscoverView | "settings";
export interface SharedLibraryCategoryItem {
  slug: string;
  label: string;
  count: number;
}

const AGENTS: { key: AgentFilter; label: string; Icon: React.FC<any> }[] = [
  { key: "all", label: "All Skills", Icon: AllSkillsIcon },
  { key: "Shared Library", label: "Shared Library", Icon: SharedLibraryIcon },
  { key: "Claude Code", label: "Claude Code", Icon: ClaudeIcon },
  { key: "Antigravity", label: "Antigravity", Icon: GeminiIcon },
  { key: "Codex", label: "Codex", Icon: OpenAIIcon },
];

const DISCOVER_ITEMS: { key: DiscoverView; label: string; Icon: React.FC<any> }[] = [
  { key: "huggingface", label: "huggingface", Icon: DownloadIcon },
  { key: "skills.sh", label: "skills.sh", Icon: GlobeIcon },
  { key: "skillsmp.com", label: "skillsmp.com", Icon: GlobeIcon },
  { key: "Install via GitHub", label: "Install via GitHub", Icon: GithubIcon },
];

interface SidebarProps {
  activeItem: SidebarItem;
  setFilter: (f: AgentFilter) => void;
  activeSharedCategory: string | null;
  sharedCategories: SharedLibraryCategoryItem[];
  onOpenSharedCategory: (slug: string) => void;
  onOpenDiscover: (view: DiscoverView) => void;
  onOpenSettings: () => void;
  onAgentContextMenu: (event: React.MouseEvent, agent: AgentFilter) => void;
  onDiscoverContextMenu: (event: React.MouseEvent, view: DiscoverView) => void;
  onSettingsContextMenu: (event: React.MouseEvent) => void;
  countByAgent: (agent: string) => number;
  dragOverTarget: string | null;
  onDragOver: (e: React.DragEvent, key: string) => void;
  onDragLeave: (e: React.DragEvent, key: string) => void;
  onDrop: (e: React.DragEvent, key: string) => void;
}

export function Sidebar({
  activeItem,
  setFilter,
  activeSharedCategory,
  sharedCategories,
  onOpenSharedCategory,
  onOpenDiscover,
  onOpenSettings,
  onAgentContextMenu,
  onDiscoverContextMenu,
  onSettingsContextMenu,
  countByAgent,
  dragOverTarget,
  onDragOver,
  onDragLeave,
  onDrop,
}: SidebarProps) {
  const getDragTargetKey = (event: React.DragEvent<HTMLElement>): string | null => {
    const pointTarget = document.elementFromPoint(event.clientX, event.clientY);
    const candidate =
      pointTarget instanceof Element
        ? pointTarget
        : event.target instanceof Element
          ? event.target
          : null;

    if (!candidate) return null;

    const row = candidate.closest<HTMLElement>("[data-agent-key]");
    return resolveSidebarDropTargetKey(row?.dataset.agentKey);
  };

  return (
    <aside
      className="sidebar"
      onDragEnterCapture={(e) => {
        const key = getDragTargetKey(e);
        if (key) onDragOver(e, key);
      }}
      onDragOverCapture={(e) => {
        const key = getDragTargetKey(e);
        if (key) onDragOver(e, key);
      }}
      onDragLeaveCapture={(e) => {
        const key = getDragTargetKey(e);
        if (key) onDragLeave(e, key);
      }}
      onDropCapture={(e) => {
        const key = getDragTargetKey(e);
        if (key) onDrop(e, key);
      }}
    >
      <div className="sidebar-body">
        <div className="sidebar-header">
          <div className="logo">
            skill hub<span className="logo-dot">.</span>
          </div>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-label">Agents</div>
          {AGENTS.map((a) => (
            <div
              key={a.key}
              data-agent-key={a.key}
              className={`sidebar-item ${
                activeItem === a.key && (a.key !== "Shared Library" || activeSharedCategory === null)
                  ? "active"
                  : ""
              } ${
                dragOverTarget === a.key ? "drag-over" : ""
              }`}
              onClick={() => setFilter(a.key)}
              onContextMenu={(event) => onAgentContextMenu(event, a.key)}
            >
              <span className="icon">
                <a.Icon size={16} />
              </span>
              {a.label}
              <span className="badge">{countByAgent(a.key)}</span>
            </div>
          ))}
          {activeItem === "Shared Library" && (
            <div className="sidebar-subtree">
              {sharedCategories.map((category) => {
                const categoryKey = `shared-category:${category.slug}`;
                return (
                  <button
                    key={category.slug}
                    type="button"
                    data-agent-key={categoryKey}
                    className={`sidebar-item sidebar-item-subtle ${
                      activeSharedCategory === category.slug ? "active" : ""
                    } ${dragOverTarget === categoryKey ? "drag-over" : ""}`}
                    onClick={() => onOpenSharedCategory(category.slug)}
                  >
                    <span className="icon" />
                    {category.label}
                    <span className="badge">{category.count}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="sidebar-section">
          <div className="sidebar-separator" />
          <div className="sidebar-label">Discover</div>
          {DISCOVER_ITEMS.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`sidebar-item ${activeItem === item.key ? "active" : ""}`}
              onClick={() => onOpenDiscover(item.key)}
              onContextMenu={(event) => onDiscoverContextMenu(event, item.key)}
            >
              <span className="icon">
                <item.Icon size={16} />
              </span>
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="sidebar-footer">
        <button
          type="button"
          className={`sidebar-item sidebar-settings ${activeItem === "settings" ? "active" : ""}`}
          onClick={onOpenSettings}
          onContextMenu={onSettingsContextMenu}
        >
          <span className="icon">
            <SettingsIcon size={16} />
          </span>
          Settings
        </button>
      </div>
    </aside>
  );
}
