import { SearchIcon } from '../Icons/Icons';
import './Topbar.css';
import { AgentFilter } from '../Sidebar/Sidebar';

interface TopbarProps {
  filter: AgentFilter;
  search: string;
  setSearch: (s: string) => void;
  filteredLength: number;
  symlinkCount: number;
  localCount: number;
}

export function Topbar({
  filter,
  search,
  setSearch,
  filteredLength,
  symlinkCount,
  localCount,
}: TopbarProps) {
  return (
    <div className="topbar-container">
      <div className="topbar">
        <h2>{filter === "all" ? "All Skills" : filter}</h2>
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
        <div className="stat-item">
          <span className="stat-value">{filteredLength}</span> skills
        </div>
        <div className="stat-item">
          <span className="stat-value">{symlinkCount}</span> symlinked
        </div>
        <div className="stat-item">
          <span className="stat-value">{localCount}</span> local
        </div>
      </div>
    </div>
  );
}
