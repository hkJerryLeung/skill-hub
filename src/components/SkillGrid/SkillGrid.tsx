import './SkillGrid.css';
import { SearchIcon } from '../Icons/Icons'; // We'll use SearchIcon for the empty state

// We define SkillInfo interface (this is shared across files, we can export it from a types file later,
// but for simplicity we can define it here or pass it)
export interface SkillInfo {
  name: string;
  description: string;
  path: string;
  agent: string;
  is_symlink: boolean;
  category: string | null;
}

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
  onDragStart: (e: React.DragEvent, skill: SkillInfo) => void;
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
  onDragStart,
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
            const id = `${skill.agent}-${skill.name}`;
            const isSelected = selectedIds.has(id);
            const isDetailActive = activeDetailId === id;

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
                draggable={true}
                onDragStart={(e) => onDragStart(e, skill)}
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
                  {skill.category && (
                    <span className="skill-card-category">{skill.category}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
