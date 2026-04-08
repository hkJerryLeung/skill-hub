import { useEffect, useRef, useState } from "react";
import { RefreshIcon, SearchIcon } from "../Icons/Icons";
import "./Topbar.css";
import { AgentFilter } from "../Sidebar/Sidebar";
import type { SharedCategoryCount } from "../../lib/skillListPresentation";
import { StatusCounts, StatusFilter } from "../../lib/skillFilters";

interface TopbarProps {
  filter: AgentFilter;
  search: string;
  setSearch: (s: string) => void;
  statusFilter: StatusFilter;
  statusCounts: StatusCounts;
  sharedCategoryCounts: SharedCategoryCount[];
  selectedSharedCategories: ReadonlySet<string>;
  refreshing: boolean;
  refreshDisabled: boolean;
  refreshLabel: string;
  checkingAll: boolean;
  updatingAll: boolean;
  autoCategorizing: boolean;
  categorizationEnabled: boolean;
  onStatusFilterChange: (filter: StatusFilter) => void;
  onToggleSharedCategory: (slug: string) => void;
  onClearSharedCategories: () => void;
  onRefresh: () => void;
  onCheckUpdates: () => void;
  onUpdateAll: () => void;
  onAutoCategorize: () => void;
}

export function Topbar({
  filter,
  search,
  setSearch,
  statusFilter,
  statusCounts,
  sharedCategoryCounts,
  selectedSharedCategories,
  refreshing,
  refreshDisabled,
  refreshLabel,
  checkingAll,
  updatingAll,
  autoCategorizing,
  categorizationEnabled,
  onStatusFilterChange,
  onToggleSharedCategory,
  onClearSharedCategories,
  onRefresh,
  onCheckUpdates,
  onUpdateAll,
  onAutoCategorize,
}: TopbarProps) {
  const [categoryFilterOpen, setCategoryFilterOpen] = useState(false);
  const categoryFilterRef = useRef<HTMLDivElement | null>(null);
  const showTypeFilters = filter !== "Shared Library";
  const title = filter === "all" ? "All Skills" : filter;

  useEffect(() => {
    if (filter !== "Shared Library") {
      setCategoryFilterOpen(false);
    }
  }, [filter]);

  useEffect(() => {
    if (!categoryFilterOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const nextTarget = event.target;
      if (!(nextTarget instanceof Node)) return;
      if (categoryFilterRef.current?.contains(nextTarget)) return;
      setCategoryFilterOpen(false);
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [categoryFilterOpen]);

  return (
    <div className="topbar-container">
      <div className="topbar">
        <h2>{title}</h2>
        <div className="topbar-actions">
          {filter === "Shared Library" && (
            <button
              className="topbar-btn"
              onClick={onAutoCategorize}
              disabled={!categorizationEnabled || autoCategorizing}
              title={
                categorizationEnabled
                  ? "Run semantic categorization for visible shared skills"
                  : "Enable categorization in Settings first"
              }
            >
              {autoCategorizing ? "Categorizing..." : "Auto Categorize"}
            </button>
          )}
          <button className="topbar-btn" onClick={onCheckUpdates} disabled={checkingAll || updatingAll}>
            {checkingAll ? "Checking..." : "Check Updates"}
          </button>
          <button className="topbar-btn primary" onClick={onUpdateAll} disabled={checkingAll || updatingAll}>
            {updatingAll ? "Updating..." : "Update All"}
          </button>
        </div>
        <div className="search-box">
          <span className="search-icon">
            <SearchIcon size={14} />
          </span>
          <input
            type="text"
            placeholder="Search skills..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>
      <div className="stats-bar">
        <div className="stats-bar-items">
          <button
            type="button"
            className={`stat-item ${statusFilter === "all" ? "active" : ""}`}
            onClick={() => onStatusFilterChange("all")}
          >
            <span className="stat-value">{statusCounts.all}</span> skills
          </button>
          {showTypeFilters && (
            <button
              type="button"
              className={`stat-item ${statusFilter === "symlinked" ? "active" : ""}`}
              onClick={() => onStatusFilterChange("symlinked")}
            >
              <span className="stat-value">{statusCounts.symlinked}</span> SYMLINKED
            </button>
          )}
          {showTypeFilters && (
            <button
              type="button"
              className={`stat-item ${statusFilter === "local" ? "active" : ""}`}
              onClick={() => onStatusFilterChange("local")}
            >
              <span className="stat-value">{statusCounts.local}</span> local
            </button>
          )}
          <button
            type="button"
            className={`stat-item ${statusFilter === "updates" ? "active" : ""}`}
            onClick={() => onStatusFilterChange("updates")}
          >
            <span className="stat-value">{statusCounts.updates}</span> updates available
          </button>
        </div>
        <div className="stats-bar-actions">
          {filter === "Shared Library" && (
            <div ref={categoryFilterRef} className={`category-filter ${categoryFilterOpen ? "open" : ""}`}>
              <button
                type="button"
                className="category-filter-trigger"
                onClick={() => setCategoryFilterOpen((current) => !current)}
              >
                {selectedSharedCategories.size > 0
                  ? `Category Filter (${selectedSharedCategories.size})`
                  : "Category Filter"}
              </button>
              {categoryFilterOpen && (
                <div className="category-filter-menu">
                  <div className="category-filter-menu-header">
                    <span className="category-filter-menu-title">Categories</span>
                    <button
                      type="button"
                      className="category-filter-clear"
                      onClick={onClearSharedCategories}
                      disabled={selectedSharedCategories.size === 0}
                    >
                      All Categories
                    </button>
                  </div>
                  <div className="category-filter-options">
                    {sharedCategoryCounts.map((category) => (
                      <label key={category.slug} className="category-filter-option">
                        <input
                          type="checkbox"
                          checked={selectedSharedCategories.has(category.slug)}
                          onChange={() => onToggleSharedCategory(category.slug)}
                        />
                        <span className="category-filter-option-label">{category.label}</span>
                        <span className="category-filter-option-count">{category.count}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <button
            type="button"
            className={`stats-refresh-btn ${refreshing ? "spinning" : ""}`}
            onClick={onRefresh}
            disabled={refreshDisabled}
            aria-label={refreshLabel}
            title={refreshLabel}
          >
            <RefreshIcon size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
