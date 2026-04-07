import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./index.css";

interface SkillInfo {
  name: string;
  description: string;
  path: string;
  agent: string;
  is_symlink: boolean;
}

interface AgentTarget {
  name: string;
  path: string;
  exists: boolean;
}

interface Toast {
  message: string;
  type: "success" | "error";
}

type AgentFilter = "all" | "Claude Code" | "Antigravity";

const AGENTS: { key: AgentFilter; label: string; icon: string }[] = [
  { key: "all", label: "All Skills", icon: "📦" },
  { key: "Claude Code", label: "Claude Code", icon: "🟣" },
  { key: "Antigravity", label: "Antigravity", icon: "🔵" },
];

function App() {
  const [skills, setSkills] = useState<SkillInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<AgentFilter>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<SkillInfo | null>(null);
  const [skillContent, setSkillContent] = useState("");
  const [skillFiles, setSkillFiles] = useState<string[]>([]);
  const [contentLoading, setContentLoading] = useState(false);
  const [targets, setTargets] = useState<AgentTarget[]>([]);
  const [toast, setToast] = useState<Toast | null>(null);

  const refreshSkills = () => {
    invoke<SkillInfo[]>("scan_skills").then(setSkills).catch(console.error);
  };

  useEffect(() => {
    refreshSkills();
    invoke<AgentTarget[]>("get_agent_targets").then(setTargets).catch(console.error);
    setLoading(false);
  }, []);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const openDetail = async (skill: SkillInfo) => {
    setSelected(skill);
    setContentLoading(true);
    try {
      const [content, files] = await Promise.all([
        invoke<string>("read_skill_content", { skillPath: skill.path }),
        invoke<string[]>("list_skill_files", { skillPath: skill.path }),
      ]);
      setSkillContent(content);
      setSkillFiles(files);
    } catch {
      setSkillContent("Could not load SKILL.md");
      setSkillFiles([]);
    }
    setContentLoading(false);
  };

  const closeDetail = () => {
    setSelected(null);
    setSkillContent("");
    setSkillFiles([]);
  };

  const handleInstall = async (targetAgent: string) => {
    if (!selected) return;
    try {
      const result = await invoke<string>("install_skill", {
        sourcePath: selected.path,
        targetAgent,
        useSymlink: true,
      });
      showToast(result, "success");
      refreshSkills();
    } catch (err) {
      showToast(String(err), "error");
    }
  };

  const handleUninstall = async () => {
    if (!selected) return;
    const confirmed = window.confirm(
      `Remove "${selected.name}" from ${selected.agent}?${
        selected.is_symlink
          ? " (symlink only — source will not be deleted)"
          : " This will delete all files permanently."
      }`
    );
    if (!confirmed) return;
    try {
      const result = await invoke<string>("uninstall_skill", {
        skillPath: selected.path,
      });
      showToast(result, "success");
      closeDetail();
      refreshSkills();
    } catch (err) {
      showToast(String(err), "error");
    }
  };

  const filtered = skills.filter((s) => {
    const matchAgent = filter === "all" || s.agent === filter;
    const matchSearch =
      search === "" ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.description.toLowerCase().includes(search.toLowerCase());
    return matchAgent && matchSearch;
  });

  const countByAgent = (agent: string) =>
    agent === "all"
      ? skills.length
      : skills.filter((s) => s.agent === agent).length;

  const symlinkCount = filtered.filter((s) => s.is_symlink).length;
  const localCount = filtered.length - symlinkCount;

  const getBodyContent = (raw: string) => {
    if (raw.startsWith("---")) {
      const secondDash = raw.indexOf("---", 3);
      if (secondDash !== -1) return raw.slice(secondDash + 3).trim();
    }
    return raw;
  };

  // Which agents DON'T already have this skill?
  const installableTargets = selected
    ? targets.filter(
        (t) =>
          t.name !== selected.agent &&
          !skills.some((s) => s.name === selected.name && s.agent === t.name)
      )
    : [];

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo">⚡</div>
          <h1>Skill Hub</h1>
        </div>
        <div className="sidebar-section">
          <div className="sidebar-label">Agents</div>
          {AGENTS.map((a) => (
            <div
              key={a.key}
              className={`sidebar-item ${filter === a.key ? "active" : ""}`}
              onClick={() => setFilter(a.key)}
            >
              <span className="icon">{a.icon}</span>
              {a.label}
              <span className="badge">{countByAgent(a.key)}</span>
            </div>
          ))}
        </div>
      </aside>

      <main className="main-content">
        <div className="topbar">
          <h2>{filter === "all" ? "All Skills" : filter}</h2>
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search skills..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="stats-bar">
          <div className="stat-item">
            <span className="stat-value">{filtered.length}</span> skills
          </div>
          <div className="stat-item">
            <span className="stat-value">{symlinkCount}</span> symlinked
          </div>
          <div className="stat-item">
            <span className="stat-value">{localCount}</span> local
          </div>
        </div>

        <div className="skill-grid-container">
          {loading ? (
            <div className="loading-container">
              <div className="spinner" />
              Scanning skills...
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="icon">🔍</div>
              <h3>No skills found</h3>
              <p>
                {search
                  ? "Try a different search term"
                  : "No skills detected in agent directories"}
              </p>
            </div>
          ) : (
            <div className="skill-grid">
              {filtered.map((skill) => (
                <div
                  className={`skill-card ${
                    selected?.name === skill.name &&
                    selected?.agent === skill.agent
                      ? "selected"
                      : ""
                  }`}
                  key={`${skill.agent}-${skill.name}`}
                  onClick={() => openDetail(skill)}
                >
                  <div className="skill-card-header">
                    <span className="skill-card-name">{skill.name}</span>
                    <span
                      className={`skill-card-badge ${
                        skill.is_symlink ? "symlink" : "local"
                      }`}
                    >
                      {skill.is_symlink ? "symlink" : "local"}
                    </span>
                  </div>
                  <div className="skill-card-desc">{skill.description}</div>
                  <div className="skill-card-footer">
                    <span className="skill-card-agent">{skill.agent}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Detail Panel */}
      {selected && (
        <>
          <div className="detail-overlay" onClick={closeDetail} />
          <div className="detail-panel">
            <div className="detail-panel-header">
              <h3>{selected.name}</h3>
              <button className="detail-close" onClick={closeDetail}>
                ✕
              </button>
            </div>
            <div className="detail-panel-body">
              <div className="detail-section">
                <div className="detail-section-label">Description</div>
                <div className="detail-section-value">{selected.description}</div>
              </div>

              {/* Install Actions */}
              <div className="install-section">
                <div className="detail-section-label">Install to Agent</div>
                <div className="install-targets">
                  {installableTargets.length > 0 ? (
                    installableTargets.map((t) => (
                      <button
                        key={t.name}
                        className="install-btn"
                        onClick={() => handleInstall(t.name)}
                      >
                        <span>➕ {t.name}</span>
                        <span className="method">symlink</span>
                      </button>
                    ))
                  ) : (
                    <div className="detail-section-value" style={{ color: "var(--text-muted)" }}>
                      Already installed in all agents
                    </div>
                  )}
                </div>
              </div>

              <div className="detail-section">
                <div className="detail-section-label">Metadata</div>
                <div className="detail-meta-grid">
                  <div className="detail-meta-item">
                    <div className="label">Agent</div>
                    <div className="value">{selected.agent}</div>
                  </div>
                  <div className="detail-meta-item">
                    <div className="label">Type</div>
                    <div className="value">{selected.is_symlink ? "Symlink" : "Local"}</div>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <div className="detail-section-label">Files</div>
                {skillFiles.length > 0 ? (
                  <div className="detail-file-list">
                    {skillFiles.map((f, i) => (
                      <div key={i} className="detail-file-item">{f}</div>
                    ))}
                  </div>
                ) : (
                  <div className="detail-section-value">Loading...</div>
                )}
              </div>

              <div className="detail-section">
                <div className="detail-section-label">SKILL.md Content</div>
                {contentLoading ? (
                  <div className="loading-container">
                    <div className="spinner" /> Loading...
                  </div>
                ) : (
                  <pre className="detail-content-pre">{getBodyContent(skillContent)}</pre>
                )}
              </div>

              <div className="detail-section">
                <div className="detail-section-label">Path</div>
                <div className="detail-path">{selected.path}</div>
              </div>

              {/* Danger Zone */}
              <div className="danger-section">
                <div className="detail-section-label">Danger Zone</div>
                <button className="uninstall-btn" onClick={handleUninstall}>
                  🗑️ Remove from {selected.agent}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Toast */}
      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}
    </div>
  );
}

export default App;
