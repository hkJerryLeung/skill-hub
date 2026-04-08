import './SkillGrid.css';
import { SearchIcon } from '../Icons/Icons'; // We'll use SearchIcon for the empty state
import { getSkillId } from '../../lib/skillIdentity';
import {
  canTriggerInlineUpdate,
  getCardStatusLabel,
  getInlineUpdateLabel,
  getVersionLabel,
} from '../../lib/updatePresentation';
import { SkillInfo } from '../../lib/skillTypes';

export interface SelectionBox {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

interface SkillGridProps {
  filtered: SkillInfo[];
  loading: boolean;
  search: string;
  selectedIds: Set<string>;
  activeDetailId?: string; // highlight if panel is open for this card
  cardRefs: React.MutableRefObject<Map<string, HTMLDivElement>>;
  onGridMouseDown: (e: React.MouseEvent) => void;
  onCardClick: (e: React.MouseEvent, skill: SkillInfo) => void;
  onCardMouseDown: (e: React.MouseEvent, skill: SkillInfo) => void;
  onCardContextMenu: (e: React.MouseEvent, skill: SkillInfo) => void;
  updatingSkillCanonicalPath: string | null;
  updatesLocked: boolean;
  onInlineUpdate: (skill: SkillInfo) => void;
}

export function SkillGrid({
  filtered,
  loading,
  search,
  selectedIds,
  activeDetailId,
  cardRefs,
  onGridMouseDown,
  onCardClick,
  onCardMouseDown,
  onCardContextMenu,
  updatingSkillCanonicalPath,
  updatesLocked,
  onInlineUpdate,
}: SkillGridProps) {
  return (
    <div className="skill-grid-container" onMouseDown={onGridMouseDown}>
      {loading ? (
        <div className="loading-container">
          <div className="spinner" />
          Scanning skills...
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="icon">
            <SearchIcon size={48} />
          </div>
          <h3>No skills found</h3>
          <p>
            {search
              ? "Try a different search term"
              : "No skills detected in agent directories"}
          </p>
        </div>
      ) : (
        <div className="skill-grid">
          {filtered.map((skill) => {
            const id = getSkillId(skill);
            const isSelected = selectedIds.has(id);
            const isDetailActive = activeDetailId === id;
            const updateStatusLabel = getCardStatusLabel(skill);
            const inlineUpdateLabel = getInlineUpdateLabel(skill);
            const inlineUpdateEnabled = canTriggerInlineUpdate(skill);
            const isInlineUpdating =
              updatingSkillCanonicalPath === skill.canonical_path;

            return (
              <div
                ref={(el) => {
                  if (el) cardRefs.current.set(id, el);
                  else cardRefs.current.delete(id);
                }}
                className={`skill-card ${isSelected ? "multi-selected" : ""} ${
                  isDetailActive ? "selected" : ""
                }`}
                key={id}
                onClick={(e) => onCardClick(e, skill)}
                onMouseDown={(e) => onCardMouseDown(e, skill)}
                onContextMenu={(e) => onCardContextMenu(e, skill)}
              >
                <div className="skill-card-header">
                  <span className="skill-card-name">{skill.name}</span>
                  <span
                    className={`skill-card-badge ${
                      skill.is_symlink ? "symlink" : "local"
                    }`}
                  >
                    {skill.is_symlink ? "SYMLINK" : "LOCAL"}
                  </span>
                </div>
                <div className="skill-card-desc">{skill.description}</div>
                {(inlineUpdateLabel || updateStatusLabel) && (
                  <div className="skill-card-meta-row">
                    {inlineUpdateEnabled ? (
                      <button
                        type="button"
                        className={`skill-card-update skill-card-update-button skill-card-update-${skill.update_status}`}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          onInlineUpdate(skill);
                        }}
                        disabled={updatesLocked || isInlineUpdating}
                      >
                        {isInlineUpdating ? "Updating..." : inlineUpdateLabel}
                      </button>
                    ) : updateStatusLabel ? (
                      <span
                        className={`skill-card-update skill-card-update-${skill.update_status}`}
                      >
                        {updateStatusLabel}
                      </span>
                    ) : null}
                  </div>
                )}
                <div className="skill-card-footer">
                  <div className="skill-card-footer-left">
                    {skill.category && (
                      <span className="skill-card-category">{skill.category}</span>
                    )}
                  </div>
                  <span className="skill-card-version">{getVersionLabel(skill)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
