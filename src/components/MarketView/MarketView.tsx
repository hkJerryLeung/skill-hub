import { openUrl } from "@tauri-apps/plugin-opener";
import { SearchIcon, RefreshIcon, DownloadIcon, GithubIcon, GlobeIcon } from "../Icons/Icons";
import { DiscoverView } from "../Sidebar/Sidebar";
import { RemoteMarketEntry } from "../../lib/marketTypes";
import "./MarketView.css";

interface InstallTargetOption {
  name: string;
  exists: boolean;
}

interface MarketViewProps {
  view: DiscoverView;
  entries: RemoteMarketEntry[];
  loading: boolean;
  error: string | null;
  search: string;
  setSearch: (value: string) => void;
  installTarget: string;
  setInstallTarget: (value: string) => void;
  installTargets: InstallTargetOption[];
  onRefresh: () => void;
  onInstallEntry: (entry: RemoteMarketEntry) => void;
  installingEntryKey: string | null;
  githubInstallUrl: string;
  setGithubInstallUrl: (value: string) => void;
  githubInstallSkillName: string;
  setGithubInstallSkillName: (value: string) => void;
  onInstallGithub: () => void;
  githubInstalling: boolean;
}

const isListView = (view: DiscoverView): view is "huggingface" | "skills.sh" =>
  view === "huggingface" || view === "skills.sh";

const formatInstalls = (value: number | null) => {
  if (value === null) return "Unknown installs";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M installs`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K installs`;
  return `${value} installs`;
};

const getEntryKey = (entry: RemoteMarketEntry) => `${entry.repo}:${entry.skill_id}`;

const openExternal = async (url: string) => {
  try {
    await openUrl(url);
  } catch (error) {
    console.error(`Failed to open ${url}:`, error);
  }
};

export function MarketView({
  view,
  entries,
  loading,
  error,
  search,
  setSearch,
  installTarget,
  setInstallTarget,
  installTargets,
  onRefresh,
  onInstallEntry,
  installingEntryKey,
  githubInstallUrl,
  setGithubInstallUrl,
  githubInstallSkillName,
  setGithubInstallSkillName,
  onInstallGithub,
  githubInstalling,
}: MarketViewProps) {
  const filteredEntries = entries.filter((entry) => {
    const query = search.trim().toLowerCase();
    if (query === "") return true;
    return (
      entry.name.toLowerCase().includes(query) ||
      entry.repo.toLowerCase().includes(query) ||
      entry.skill_id.toLowerCase().includes(query)
    );
  });

  const title =
    view === "huggingface"
      ? "huggingface"
      : view === "skills.sh"
        ? "skills.sh"
        : view === "skillsmp.com"
          ? "skillsmp.com"
          : "Install via GitHub";

  const subtitle =
    view === "huggingface"
      ? "Top Hugging Face skills ranked from the public skills.sh catalog, ready to install into your local agent targets."
      : view === "skills.sh"
        ? "Browse the public skills.sh leaderboard and install the hottest skills straight from GitHub."
        : view === "skillsmp.com"
          ? "SkillsMP is included as a first-class source, but its live API requires an API key and the public site currently expects a browser challenge."
        : "Paste a GitHub repository URL or a tree URL to a specific skill folder. Add a skill name hint when the repository contains multiple skills.";

  const installTargetLabel =
    installTarget === "" ? "Pick an install target" : installTarget;

  return (
    <div className="market-view">
      <div className="market-hero">
        <div className="market-hero-copy">
          <div className="market-kicker">Discover</div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>

        {isListView(view) && (
          <div className="market-hero-actions">
            <label className="market-target-picker">
              <span>Install to</span>
              <select
                value={installTarget}
                onChange={(event) => setInstallTarget(event.target.value)}
              >
                {installTargets.map((target) => (
                  <option key={target.name} value={target.name}>
                    {target.name}
                    {target.exists ? "" : " (create folder)"}
                  </option>
                ))}
              </select>
            </label>

            <button type="button" className="market-btn" onClick={onRefresh}>
              Refresh
            </button>
          </div>
        )}
      </div>

      {isListView(view) ? (
        <div className="market-provenance-note market-provenance-banner">
          Remote installs save the resolved GitHub tree plus market provenance into{" "}
          <code>SKILL.md</code> so update tracking keeps a stable upstream source.
        </div>
      ) : null}

      {view === "skillsmp.com" ? (
        <div className="market-callout">
          <div className="market-callout-card">
            <h3>Browser handoff</h3>
            <p>
              The public `skillsmp.com` site is protected by a browser challenge, and its REST API
              requires an API key. This app exposes the source directly without faking a cached
              list.
            </p>
            <div className="market-callout-actions">
              <button
                type="button"
                className="market-btn primary"
                onClick={() => void openExternal("https://skillsmp.com/")}
              >
                <GlobeIcon size={14} className="btn-icon" />
                Open skillsmp.com
              </button>
              <button
                type="button"
                className="market-btn"
                onClick={() => void openExternal("https://skillsmp.com/docs/api")}
              >
                <SearchIcon size={14} className="btn-icon" />
                Open API docs
              </button>
            </div>
          </div>
        </div>
      ) : view === "Install via GitHub" ? (
        <div className="market-callout">
          <div className="market-callout-card github-install-card">
            <div className="github-install-grid">
              <label className="github-field full">
                <span>GitHub URL</span>
                <input
                  type="url"
                  value={githubInstallUrl}
                  onChange={(event) => setGithubInstallUrl(event.target.value)}
                  placeholder="https://github.com/owner/repo or .../tree/main/skills/my-skill"
                />
              </label>

              <label className="github-field">
                <span>Skill name hint</span>
                <input
                  type="text"
                  value={githubInstallSkillName}
                  onChange={(event) => setGithubInstallSkillName(event.target.value)}
                  placeholder="Optional for multi-skill repos"
                />
              </label>

              <label className="github-field">
                <span>Install to</span>
                <select
                  value={installTarget}
                  onChange={(event) => setInstallTarget(event.target.value)}
                >
                  {installTargets.map((target) => (
                    <option key={target.name} value={target.name}>
                      {target.name}
                      {target.exists ? "" : " (create folder)"}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="market-provenance-note">
              Direct GitHub installs record the resolved GitHub source in <code>SKILL.md</code>.
              The default install target is <code>Shared Library</code> when it exists.
            </div>

            <div className="market-callout-actions">
              <button
                type="button"
                className="market-btn primary"
                onClick={onInstallGithub}
                disabled={githubInstalling || installTarget === "" || githubInstallUrl.trim() === ""}
              >
                <GithubIcon size={14} className="btn-icon" />
                {githubInstalling ? "Installing..." : "Install from GitHub"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="market-toolbar">
            <div className="search-box">
              <span className="search-icon">
                <SearchIcon size={14} />
              </span>
              <input
                type="text"
                placeholder={`Search ${view} skills...`}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div className="loading-container">
              <div className="spinner" />
              Loading remote skills...
            </div>
          ) : error ? (
            <div className="market-callout">
              <div className="market-callout-card">
                <h3>Could not load {view}</h3>
                <p>{error}</p>
                <div className="market-callout-actions">
                  <button type="button" className="market-btn primary" onClick={onRefresh}>
                    <RefreshIcon size={14} className="btn-icon" />
                    Retry
                  </button>
                </div>
              </div>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="empty-state">
              <div className="icon">
                <SearchIcon size={48} />
              </div>
              <h3>No remote skills found</h3>
              <p>{search ? "Try a different search term" : "No skills were returned for this source"}</p>
            </div>
          ) : (
            <div className="market-grid">
              {filteredEntries.map((entry) => {
                const entryKey = getEntryKey(entry);
                const installing = installingEntryKey === entryKey;

                return (
                  <div key={entryKey} className="market-card">
                    <div className="market-card-content">
                      <div className="market-card-header">
                        <div className="market-card-title-group">
                          <div className="market-card-eyebrow">{entry.source}</div>
                          <h3>{entry.name}</h3>
                          <div className="market-card-source">{entry.repo}</div>
                        </div>
                        <span className="market-card-badge">{formatInstalls(entry.installs)}</span>
                      </div>

                      <p className="market-card-body">
                        {entry.summary ??
                          `Install ${entry.skill_id} from ${entry.repo} into ${installTargetLabel}.`}
                      </p>

                      <div className="market-card-meta">
                        <div className="market-card-meta-row">
                          <span>Skill ID</span>
                          <code>{entry.skill_id}</code>
                        </div>
                        <div className="market-card-meta-row">
                          <span>Install to</span>
                          <strong>{installTargetLabel}</strong>
                        </div>
                        <div className="market-card-meta-row">
                          <span>Source page</span>
                          <button
                            type="button"
                            className="market-link-btn"
                            onClick={() => void openExternal(entry.market_url)}
                          >
                            {entry.source}
                          </button>
                        </div>
                        <div className="market-card-meta-row">
                          <span>GitHub repo</span>
                          <button
                            type="button"
                            className="market-link-btn"
                            onClick={() => void openExternal(entry.github_url)}
                          >
                            {entry.repo}
                          </button>
                        </div>
                      </div>

                      {entry.install_command ? (
                        <div className="market-card-command">
                          <span>Install command</span>
                          <code>{entry.install_command}</code>
                        </div>
                      ) : null}

                      <div className="market-card-footnote">
                        Installing from this card records <code>source</code>,{" "}
                        <code>source_market</code>, and the market page URL for provenance and
                        future update management.
                      </div>
                    </div>

                    <div className="market-card-actions">
                      <button
                        type="button"
                        className="market-btn primary"
                        onClick={() => onInstallEntry(entry)}
                        disabled={installTarget === "" || installing}
                      >
                        <DownloadIcon size={14} className="btn-icon" />
                        {installing ? "Installing..." : "Install"}
                      </button>

                      <button
                        type="button"
                        className="market-btn"
                        onClick={() => void openExternal(entry.market_url)}
                      >
                        <GlobeIcon size={14} className="btn-icon" />
                        Open source page
                      </button>

                      <button
                        type="button"
                        className="market-btn"
                        onClick={() => void openExternal(entry.github_url)}
                      >
                        <GithubIcon size={14} className="btn-icon" />
                        Open GitHub
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
