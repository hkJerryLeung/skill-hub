export type RemoteMarketSource = "huggingface" | "skills.sh";

export interface RemoteMarketEntry {
  source: string;
  repo: string;
  github_url: string;
  skill_id: string;
  name: string;
  installs: number | null;
  summary: string | null;
  market_url: string;
  install_command: string | null;
}
