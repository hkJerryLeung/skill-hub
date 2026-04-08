import './DetailPanel.css';
import { revealItemInDir } from '@tauri-apps/plugin-opener';
import { SkillInfo } from '../../lib/skillTypes';
import { getSharedLibraryCategoryLabel } from '../../lib/sharedLibraryCategories';
import { canAutoUpdate, formatLastChecked, getUpdateStatusLabel, getVersionLabel } from '../../lib/updatePresentation';
import {
  CloseIcon,
  PlusIcon,
  MinusIcon,
  TrashIcon,
  FolderOpenIcon,
  RefreshIcon,
  DownloadIcon,
} from '../Icons/Icons';

interface AgentStatus {
  name: string;
  installed: boolean;
  skillPath?: string;
  isSymlink?: boolean;
}

interface DetailPanelProps {
  selected: SkillInfo | null;
  contentLoading: boolean;
  skillContent: string;
  skillFiles: string[];
  agentStatuses: AgentStatus[];
  checkingUpdate: boolean;
  updatingSkill: boolean;
  onClose: () => void;
  onCheckUpdate: () => void;
  onUpdateSkill: () => void;
  onInstall: (targetAgent: string) => void;
  onUninstall: () => void;
  onUninstallFromTarget: (skillPath: string, isSymlink: boolean) => void;
}

export function DetailPanel({
  selected,
  contentLoading,
  skillContent,
  skillFiles,
  agentStatuses,
  checkingUpdate,
  updatingSkill,
  onClose,
  onCheckUpdate,
  onUpdateSkill,
  onInstall,
  onUninstall,
  onUninstallFromTarget,
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
              {agentStatuses.length > 0 ? (
                agentStatuses.map((t) => (
                  <button
                    key={t.name}
                    className={`install-btn ${t.installed ? 'installed' : ''}`}
                    onClick={() => {
                      if (t.installed && t.skillPath) {
                        onUninstallFromTarget(t.skillPath, !!t.isSymlink);
                      } else {
                        onInstall(t.name);
                      }
                    }}
                  >
                    <span>
                      {t.installed ? (
                        <MinusIcon size={14} className="btn-icon" />
                      ) : (
                        <PlusIcon size={14} className="btn-icon" />
                      )}
                      {t.name}
                    </span>
                    <span className="method">{t.installed ? 'INSTALLED' : 'ADD'}</span>
                  </button>
                ))
              ) : (
                <div className="detail-section-value" style={{ color: "var(--text-muted)" }}>
                  No available agents
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
                <div className="value">{selected.is_symlink ? "SYMLINK" : "LOCAL"}</div>
              </div>
              <div className="detail-meta-item">
                <div className="label">Category</div>
                <div className="value">
                  {getSharedLibraryCategoryLabel(
                    selected.category ?? (selected.agent === "Shared Library" ? "uncategorized" : null),
                  ) ?? "Not categorized"}
                </div>
              </div>
              <div className="detail-meta-item">
                <div className="label">Category Source</div>
                <div className="value">{selected.category_assignment_mode ?? "Unknown"}</div>
              </div>
              <div className="detail-meta-item">
                <div className="label">Category Confidence</div>
                <div className="value">
                  {selected.category_confidence === null
                    ? "Unknown"
                    : `${Math.round(selected.category_confidence * 100)}%`}
                </div>
              </div>
              <div className="detail-meta-item">
                <div className="label">Version</div>
                <div className="value">{getVersionLabel(selected)}</div>
              </div>
              <div className="detail-meta-item">
                <div className="label">Update Status</div>
                <div className="value">
                  {getUpdateStatusLabel(selected.update_status, selected.update_capability) ?? "Not Checked"}
                </div>
              </div>
              <div className="detail-meta-item">
                <div className="label">Upstream Version</div>
                <div className="value">{selected.upstream_version ?? "Unknown"}</div>
              </div>
              <div className="detail-meta-item">
                <div className="label">Last Checked</div>
                <div className="value">{formatLastChecked(selected.last_checked_at)}</div>
              </div>
            </div>
          </div>

          <div className="detail-section">
            <div className="detail-section-header-flex">
              <div className="detail-section-label">Updates</div>
            </div>
            <div className="detail-action-row">
              <button
                className="detail-action-btn"
                onClick={onCheckUpdate}
                disabled={checkingUpdate || updatingSkill}
              >
                <RefreshIcon size={14} className="btn-icon" />
                {checkingUpdate ? "Checking..." : "Check Update"}
              </button>
              <button
                className="detail-action-btn primary"
                onClick={onUpdateSkill}
                disabled={!canAutoUpdate(selected) || checkingUpdate || updatingSkill}
              >
                <DownloadIcon size={14} className="btn-icon" />
                {updatingSkill ? "Updating..." : "Update Skill"}
              </button>
            </div>
            <div className="detail-help-text">
              {selected.update_capability === "github"
                ? "GitHub-backed skills can be updated automatically. A backup is created before files are overwritten."
                : selected.update_capability === "external"
                  ? "External sources support version hints only. Update this skill manually from its source."
                  : "This skill does not expose an auto-update source."}
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
            <div className="detail-section-label">Source</div>
            <div className="detail-path">{selected.source ?? "No source metadata"}</div>
          </div>

          <div className="detail-section">
            <div className="detail-section-header-flex">
              <div className="detail-section-label">Path</div>
              <button 
                className="path-open-btn" 
                onClick={async () => {
                  try {
                    await revealItemInDir(selected.path);
                  } catch (e) {
                    console.error("Failed to reveal path:", e);
                  }
                }}
                title="Reveal in Finder"
              >
                <FolderOpenIcon size={14} /> Reveal
              </button>
            </div>
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
