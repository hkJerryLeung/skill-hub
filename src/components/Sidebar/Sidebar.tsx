import React from 'react';
import { AllSkillsIcon, SharedLibraryIcon, ClaudeIcon, GeminiIcon, OpenAIIcon } from '../Icons/Icons';
import './Sidebar.css';

export type AgentFilter = "all" | "Claude Code" | "Antigravity" | "Codex" | "Shared Library";

const AGENTS: { key: AgentFilter; label: string; Icon: React.FC<any> }[] = [
  { key: "all", label: "All Skills", Icon: AllSkillsIcon },
  { key: "Shared Library", label: "Shared Library", Icon: SharedLibraryIcon },
  { key: "Claude Code", label: "Claude Code", Icon: ClaudeIcon },
  { key: "Antigravity", label: "Antigravity", Icon: GeminiIcon },
  { key: "Codex", label: "Codex", Icon: OpenAIIcon },
];

interface SidebarProps {
  filter: AgentFilter;
  setFilter: (f: AgentFilter) => void;
  countByAgent: (agent: string) => number;
  dragOverTarget: AgentFilter | null;
  onDragOver: (e: React.DragEvent, key: AgentFilter) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, key: AgentFilter) => void;
}

export function Sidebar({
  filter,
  setFilter,
  countByAgent,
  dragOverTarget,
  onDragOver,
  onDragLeave,
  onDrop,
}: SidebarProps) {
  return (
    <aside className="sidebar">
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
            className={`sidebar-item ${filter === a.key ? "active" : ""} ${
              dragOverTarget === a.key ? "drag-over" : ""
            }`}
            onClick={() => setFilter(a.key)}
            onDragEnter={(e) => {
              e.preventDefault();
              onDragOver(e, a.key);
            }}
            onDragOver={(e) => onDragOver(e, a.key)}
            onDragLeave={onDragLeave}
            onDrop={(e) => onDrop(e, a.key)}
          >
            <span className="icon">
              <a.Icon size={16} />
            </span>
            {a.label}
            <span className="badge">{countByAgent(a.key)}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}
