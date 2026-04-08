import { RefreshIcon, SearchIcon } from '../Icons/Icons';
import './Topbar.css';
import { AgentFilter } from '../Sidebar/Sidebar';
import { StatusCounts, StatusFilter } from '../../lib/skillFilters';

interface TopbarProps {
  filter: AgentFilter;
  search: string;
  setSearch: (s: string) => void;
  statusFilter: StatusFilter;
  statusCounts: StatusCounts;
  refreshing: boolean;
  refreshDisabled: boolean;
  refreshLabel: string;
  checkingAll: boolean;
  updatingAll: boolean;
  onStatusFilterChange: (filter: StatusFilter) => void;
  onRefresh: () => void;
  onCheckUpdates: () => void;
  onUpdateAll: () => void;
}

export function Topbar({
  filter,
  search,
  setSearch,
  statusFilter,
  statusCounts,
  refreshing,
  refreshDisabled,
  refreshLabel,
  checkingAll,
  updatingAll,
  onStatusFilterChange,
  onRefresh,
  onCheckUpdates,
  onUpdateAll,
}: TopbarProps) {
  const showTypeFilters = filter !== "Shared Library";

  return (
    <div className="topbar-container">
      <div className="topbar">
        <h2>{filter === "all" ? "All Skills" : filter}</h2>
        <div className="topbar-actions">
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
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      <div className="stats-bar">
        <button
          type="button"
          className={`stat-item ${statusFilter === 'all' ? 'active' : ''}`}
          onClick={() => onStatusFilterChange('all')}
        >
          <span className="stat-value">{statusCounts.all}</span> skills
        </button>
        {showTypeFilters && (
          <button
            type="button"
            className={`stat-item ${statusFilter === 'symlinked' ? 'active' : ''}`}
            onClick={() => onStatusFilterChange('symlinked')}
          >
            <span className="stat-value">{statusCounts.symlinked}</span> SYMLINKED
          </button>
        )}
        {showTypeFilters && (
          <button
            type="button"
            className={`stat-item ${statusFilter === 'local' ? 'active' : ''}`}
            onClick={() => onStatusFilterChange('local')}
          >
            <span className="stat-value">{statusCounts.local}</span> local
          </button>
        )}
        <button
          type="button"
          className={`stat-item ${statusFilter === 'updates' ? 'active' : ''}`}
          onClick={() => onStatusFilterChange('updates')}
        >
          <span className="stat-value">{statusCounts.updates}</span> updates available
        </button>
        <button
          type="button"
          className={`stats-refresh-btn ${refreshing ? 'spinning' : ''}`}
          onClick={onRefresh}
          disabled={refreshDisabled}
          aria-label={refreshLabel}
          title={refreshLabel}
        >
          <RefreshIcon size={15} />
        </button>
      </div>
    </div>
  );
}
