import './SkillGrid.css';
import { SearchIcon } from '../Icons/Icons'; // We'll use SearchIcon for the empty state
import { getSkillId } from '../../lib/skillIdentity';
import type { SharedCategoryPresentation } from '../../lib/skillListPresentation';
import { buildSkillPurposeComparison } from '../../lib/skillPurposePresentation';
import type { SkillInfo } from '../../lib/skillTypes';

export interface SelectionBox {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

interface SkillGridProps {
  filtered: SkillInfo[];
  sharedCategoryGroups: SharedCategoryPresentation[];
  isSharedLibraryView: boolean;
  collapsedSharedCategories: ReadonlySet<string>;
  dragOverTarget: string | null;
  loading: boolean;
  search: string;
  selectedIds: Set<string>;
  activeDetailId?: string; // highlight if panel is open for this card
  cardRefs: React.MutableRefObject<Map<string, HTMLDivElement>>;
  onGridMouseDown: (e: React.MouseEvent) => void;
  onCardClick: (e: React.MouseEvent, skill: SkillInfo) => void;
  onCardMouseDown: (e: React.MouseEvent, skill: SkillInfo) => void;
  onCardContextMenu: (e: React.MouseEvent, skill: SkillInfo) => void;
  onToggleSharedCategory: (slug: string) => void;
  onSharedCategoryDragOver: (e: React.DragEvent, slug: string) => void;
  onSharedCategoryDragLeave: (e: React.DragEvent, slug: string) => void;
  onSharedCategoryDrop: (e: React.DragEvent, slug: string) => void;
}

export function SkillGrid({
  filtered,
  sharedCategoryGroups,
  isSharedLibraryView,
  collapsedSharedCategories,
  dragOverTarget,
  loading,
  search,
  selectedIds,
  activeDetailId,
  cardRefs,
  onGridMouseDown,
  onCardClick,
  onCardMouseDown,
  onCardContextMenu,
  onToggleSharedCategory,
  onSharedCategoryDragOver,
  onSharedCategoryDragLeave,
  onSharedCategoryDrop,
}: SkillGridProps) {
  const renderSkillRows = (skills: SkillInfo[]) =>
    skills.map((skill) => {
      const id = getSkillId(skill);
      const isSelected = selectedIds.has(id);
      const isDetailActive = activeDetailId === id;
      const purpose = buildSkillPurposeComparison(skill);

      return (
        <div
          ref={(el) => {
            if (el) cardRefs.current.set(id, el);
            else cardRefs.current.delete(id);
          }}
          className={`skill-card skill-list-row ${skill.is_symlink ? "symlink-skill" : ""} ${
            !isSharedLibraryView ? "non-shared-skill" : ""
          } ${isSelected ? "multi-selected" : ""} ${isDetailActive ? "selected" : ""}`}
          key={id}
          onClick={(e) => onCardClick(e, skill)}
          onMouseDown={(e) => onCardMouseDown(e, skill)}
          onContextMenu={(e) => onCardContextMenu(e, skill)}
          role="row"
        >
          <div className="skill-list-cell skill-list-skill" role="cell">
            <span className="skill-list-cell-label">Skill</span>
            <div className="skill-card-header">
              <span className="skill-card-name">{skill.name}</span>
            </div>
            <span className="skill-card-summary">{purpose.summary}</span>
          </div>
          <div className="skill-list-cell skill-list-before" role="cell">
            <span className="skill-list-cell-label">Before</span>
            <span className="skill-list-text">{purpose.before}</span>
          </div>
          <div className="skill-list-cell skill-list-after" role="cell">
            <span className="skill-list-cell-label">After</span>
            <span className="skill-list-text">{purpose.after}</span>
          </div>
        </div>
      );
    });

  const renderSkillList = (skills: SkillInfo[], label: string) => (
    <div className="skill-list" role="table" aria-label={label}>
      <div className="skill-list-header" role="row">
        <span className="skill-list-header-label" role="columnheader">Skill</span>
        <span className="skill-list-header-label" role="columnheader">Before</span>
        <span className="skill-list-header-label" role="columnheader">After</span>
      </div>
      {renderSkillRows(skills)}
    </div>
  );

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
      ) : isSharedLibraryView ? (
        <div className="shared-category-list">
          {sharedCategoryGroups.map((group) => {
            const collapsed = collapsedSharedCategories.has(group.slug);
            const targetKey = `shared-category:${group.slug}`;

            return (
              <section key={group.slug} className="shared-category-section">
                <button
                  type="button"
                  className={`shared-category-header ${
                    dragOverTarget === targetKey ? "drag-over" : ""
                  }`}
                  data-drop-target={`shared-category:${group.slug}`}
                  onClick={() => onToggleSharedCategory(group.slug)}
                  onDragEnter={(e) => onSharedCategoryDragOver(e, group.slug)}
                  onDragOver={(e) => onSharedCategoryDragOver(e, group.slug)}
                  onDragLeave={(e) => onSharedCategoryDragLeave(e, group.slug)}
                  onDrop={(e) => onSharedCategoryDrop(e, group.slug)}
                >
                  <span className="shared-category-header-text">
                    {group.label}
                  </span>
                  <span className="shared-category-header-meta">
                    <span className="shared-category-count">{group.skills.length}</span>
                    <span className={`shared-category-chevron ${collapsed ? "collapsed" : ""}`}>
                      {collapsed ? "+" : "-"}
                    </span>
                  </span>
                </button>
                {!collapsed && (
                  renderSkillList(group.skills, `${group.label} skills`)
                )}
              </section>
            );
          })}
        </div>
      ) : (
        renderSkillList(filtered, "Skills")
      )}
    </div>
  );
}
