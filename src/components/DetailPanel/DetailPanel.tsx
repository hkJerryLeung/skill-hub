import './DetailPanel.css';
import { CloseIcon, PlusIcon, TrashIcon } from '../Icons/Icons';
import { SkillInfo } from '../SkillGrid/SkillGrid';

interface AgentTarget {
  name: string;
  path: string;
  exists: boolean;
}

interface DetailPanelProps {
  selected: SkillInfo | null;
  contentLoading: boolean;
  skillContent: string;
  skillFiles: string[];
  installableTargets: AgentTarget[];
  onClose: () => void;
  onInstall: (targetAgent: string) => void;
  onUninstall: () => void;
}

export function DetailPanel({
  selected,
  contentLoading,
  skillContent,
  skillFiles,
  installableTargets,
  onClose,
  onInstall,
  onUninstall,
}: DetailPanelProps) {
  if (!selected) return null;

  const getBodyContent = (raw: string) => {
    if (raw.startsWith("---")) {
      const secondDash = raw.indexOf("---", 3);
      if (secondDash !== -1) return raw.slice(secondDash + 3).trim();
    }
    return raw;
  };

  return (
    <>
      <div className="detail-overlay" onClick={onClose} />
      <div className="detail-panel">
        <div className="detail-panel-header">
          <h3>{selected.name}</h3>
          <button className="detail-close" onClick={onClose} aria-label="Close details">
            <CloseIcon size={14} />
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
                    onClick={() => onInstall(t.name)}
                  >
                    <span>
                      <PlusIcon size={14} className="btn-icon" /> {t.name}
                    </span>
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
            <button className="uninstall-btn" onClick={onUninstall}>
              <TrashIcon size={14} className="btn-icon" /> Remove from {selected.agent}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
