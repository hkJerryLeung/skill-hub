import { useState } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
  CloseIcon,
  DownloadIcon,
  GithubIcon,
  RefreshIcon,
  SearchIcon,
  SettingsIcon,
  SparkIcon,
} from "../Icons/Icons";
import { DiscoverView } from "../Sidebar/Sidebar";
import type {
  LocalSkillModel,
  SkillScoutRecommendation,
  SkillScoutResponse,
} from "../../lib/localScoutTypes";
import "./MarketView.css";

interface InstallTargetOption {
  name: string;
  exists: boolean;
}

interface MarketViewProps {
  view: DiscoverView;
  installTarget: string;
  setInstallTarget: (value: string) => void;
  installTargets: InstallTargetOption[];
  githubInstallUrl: string;
  setGithubInstallUrl: (value: string) => void;
  githubInstallSkillName: string;
  setGithubInstallSkillName: (value: string) => void;
  onInstallGithub: () => void;
  githubInstalling: boolean;
  localScoutModels: LocalSkillModel[];
  localScoutModelId: string;
  onSelectLocalScoutModel: (id: string) => void;
  localScoutDetecting: boolean;
  localScoutProvider: LocalSkillModel["provider"];
  setLocalScoutProvider: (value: LocalSkillModel["provider"]) => void;
  localScoutBaseUrl: string;
  setLocalScoutBaseUrl: (value: string) => void;
  localScoutModel: string;
  setLocalScoutModel: (value: string) => void;
  localScoutPrompt: string;
  setLocalScoutPrompt: (value: string) => void;
  localScoutLastPrompt: string;
  localScoutResponse: SkillScoutResponse | null;
  localScoutLoading: boolean;
  localScoutError: string | null;
  onRefreshLocalScoutModels: () => void;
  onAskLocalScout: () => void;
  onInstallLocalScoutRecommendation: (recommendation: SkillScoutRecommendation) => void;
  installingLocalScoutKey: string | null;
}

const getRecommendationKey = (recommendation: SkillScoutRecommendation) =>
  `${recommendation.github_url}:${recommendation.skill_name ?? ""}`;

const formatConfidence = (value: number | null) => {
  if (value === null) return "Confidence not stated";
  return `${Math.round(value * 100)}% confidence`;
};

const openExternal = async (url: string) => {
  try {
    await openUrl(url);
  } catch (error) {
    console.error(`Failed to open ${url}:`, error);
  }
};

export function MarketView({
  view,
  installTarget,
  setInstallTarget,
  installTargets,
  githubInstallUrl,
  setGithubInstallUrl,
  githubInstallSkillName,
  setGithubInstallSkillName,
  onInstallGithub,
  githubInstalling,
  localScoutModels,
  localScoutModelId,
  onSelectLocalScoutModel,
  localScoutDetecting,
  localScoutProvider,
  setLocalScoutProvider,
  localScoutBaseUrl,
  setLocalScoutBaseUrl,
  localScoutModel,
  setLocalScoutModel,
  localScoutPrompt,
  setLocalScoutPrompt,
  localScoutLastPrompt,
  localScoutResponse,
  localScoutLoading,
  localScoutError,
  onRefreshLocalScoutModels,
  onAskLocalScout,
  onInstallLocalScoutRecommendation,
  installingLocalScoutKey,
}: MarketViewProps) {
  const [modelSettingsOpen, setModelSettingsOpen] = useState(false);
  const canAskLocalScout =
    !localScoutLoading &&
    localScoutBaseUrl.trim() !== "" &&
    localScoutModel.trim() !== "" &&
    localScoutPrompt.trim() !== "";

  const renderRecommendation = (recommendation: SkillScoutRecommendation) => {
    const key = getRecommendationKey(recommendation);
    const installing = installingLocalScoutKey === key;

    return (
      <article key={key} className="ai-install-recommendation">
        <div className="market-card-eyebrow">
          {formatConfidence(recommendation.confidence)}
        </div>
        <h3>{recommendation.title}</h3>
        <p>{recommendation.reason}</p>
        <div className="market-card-meta">
          <div className="market-card-meta-row">
            <span>GitHub</span>
            <button
              type="button"
              className="market-link-btn"
              onClick={() => void openExternal(recommendation.github_url)}
            >
              {recommendation.github_url}
            </button>
          </div>
          <div className="market-card-meta-row">
            <span>Skill hint</span>
            <code>{recommendation.skill_name ?? "Auto-detect"}</code>
          </div>
        </div>
        <div className="market-card-actions single">
          <button
            type="button"
            className="market-btn primary"
            onClick={() => onInstallLocalScoutRecommendation(recommendation)}
            disabled={installing}
          >
            <DownloadIcon size={14} className="btn-icon" />
            {installing ? "Installing..." : "Install to Shared Library"}
          </button>
        </div>
      </article>
    );
  };

  if (view === "AI Install") {
    return (
      <div className="market-view ai-install-view">
        <div className="ai-install-topbar">
          <div className="ai-install-title">
            <div className="market-kicker">Discover</div>
            <h2>AI Install</h2>
          </div>

          <button
            type="button"
            className="market-btn"
            onClick={() => setModelSettingsOpen(true)}
          >
            <SettingsIcon size={14} className="btn-icon" />
            Model settings
          </button>
        </div>

        <div className="ai-install-chat">
          <div className="ai-install-thread">
            {localScoutLastPrompt === "" &&
            !localScoutResponse &&
            !localScoutLoading &&
            !localScoutError ? (
              <div className="ai-install-empty">
                <div className="icon">
                  <SparkIcon size={40} />
                </div>
                <h3>What are we installing?</h3>
              </div>
            ) : null}

            {localScoutLastPrompt ? (
              <div className="ai-install-message user">
                <div className="ai-install-bubble">{localScoutLastPrompt}</div>
              </div>
            ) : null}

            {localScoutLoading ? (
              <div className="ai-install-message assistant">
                <div className="ai-install-bubble muted">Searching...</div>
              </div>
            ) : null}

            {localScoutError ? (
              <div className="ai-install-message assistant">
                <div className="market-error-note">{localScoutError}</div>
              </div>
            ) : null}

            {localScoutResponse ? (
              <div className="ai-install-message assistant">
                <div className="ai-install-bubble">
                  <p>{localScoutResponse.message}</p>

                  {localScoutResponse.recommendations.length === 0 ? (
                    <div className="empty-state compact">
                      <div className="icon">
                        <SearchIcon size={32} />
                      </div>
                      <h3>No installable GitHub skills returned</h3>
                    </div>
                  ) : (
                    <div className="ai-install-recommendations">
                      {localScoutResponse.recommendations.map(renderRecommendation)}
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          <form
            className="ai-install-composer"
            onSubmit={(event) => {
              event.preventDefault();
              if (canAskLocalScout) {
                onAskLocalScout();
              }
            }}
          >
            <textarea
              value={localScoutPrompt}
              onChange={(event) => setLocalScoutPrompt(event.target.value)}
              placeholder="Message AI Install"
              rows={3}
            />
            <button
              type="submit"
              className="market-btn primary"
              disabled={!canAskLocalScout}
            >
              <SparkIcon size={14} className="btn-icon" />
              {localScoutLoading ? "Asking..." : "Ask"}
            </button>
          </form>
        </div>

        {modelSettingsOpen ? (
          <div
            className="ai-install-settings-backdrop"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setModelSettingsOpen(false);
              }
            }}
          >
            <section
              className="ai-install-settings-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="ai-install-settings-title"
            >
              <div className="ai-install-settings-header">
                <h3 id="ai-install-settings-title">Model settings</h3>
                <button
                  type="button"
                  className="market-icon-btn"
                  aria-label="Close model settings"
                  onClick={() => setModelSettingsOpen(false)}
                >
                  <CloseIcon size={16} />
                </button>
              </div>

              <div className="ai-scout-grid">
                <label className="github-field full">
                  <span>Detected model</span>
                  <select
                    value={localScoutModelId}
                    onChange={(event) => onSelectLocalScoutModel(event.target.value)}
                  >
                    <option value="">Manual configuration</option>
                    {localScoutModels.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.provider_label} / {model.model}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="github-field">
                  <span>Provider</span>
                  <select
                    value={localScoutProvider}
                    onChange={(event) =>
                      setLocalScoutProvider(event.target.value as LocalSkillModel["provider"])
                    }
                  >
                    <option value="openai_compatible">OpenAI-compatible</option>
                    <option value="ollama">Ollama</option>
                  </select>
                </label>

                <label className="github-field">
                  <span>Base URL</span>
                  <input
                    type="url"
                    value={localScoutBaseUrl}
                    onChange={(event) => setLocalScoutBaseUrl(event.target.value)}
                    placeholder="http://localhost:1234/v1"
                  />
                </label>

                <label className="github-field full">
                  <span>Model</span>
                  <input
                    type="text"
                    value={localScoutModel}
                    onChange={(event) => setLocalScoutModel(event.target.value)}
                    placeholder="llama3.2, qwen, mistral, or your local model id"
                  />
                </label>
              </div>

              <div className="market-callout-actions">
                <button
                  type="button"
                  className="market-btn"
                  onClick={onRefreshLocalScoutModels}
                  disabled={localScoutDetecting}
                >
                  <RefreshIcon size={14} className="btn-icon" />
                  {localScoutDetecting ? "Detecting..." : "Detect models"}
                </button>
                <button
                  type="button"
                  className="market-btn primary"
                  onClick={() => setModelSettingsOpen(false)}
                >
                  Apply
                </button>
              </div>
            </section>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="market-view">
      <div className="market-hero">
        <div className="market-hero-copy">
          <div className="market-kicker">Discover</div>
          <h2>Install via GitHub</h2>
          <p>
            Paste a GitHub repository URL or a tree URL to a specific skill folder. Add a skill
            name hint when the repository contains multiple skills.
          </p>
        </div>
      </div>

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
    </div>
  );
}
