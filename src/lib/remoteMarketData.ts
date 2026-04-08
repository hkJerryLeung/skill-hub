export interface RemoteMarketEntry {
  source: "huggingface" | "skills.sh";
  repo: string;
  githubUrl: string;
  skillId: string;
  name: string;
  installs: number | null;
}

export interface RemoteMarketDetail {
  summary: string | null;
  installCommand: string | null;
}

const SKILLS_SH_LEADERBOARD_RE =
  /"source":"([^"]+)","skillId":"([^"]+)","name":"([^"]+)","installs":(\d+)/g;

const HUGGING_FACE_REPOSITORY_RE =
  /href="\/huggingface\/skills\/([^"]+)"[\s\S]*?<h3[^>]*>([^<]+)<\/h3>[\s\S]*?<span[^>]*>(\d+)<\/span>/g;

export function parseSkillsShLeaderboard(
  html: string,
  limit = 20,
): RemoteMarketEntry[] {
  const normalized = html.split('\\"').join('"');
  const matches = normalized.matchAll(SKILLS_SH_LEADERBOARD_RE);
  const entries: RemoteMarketEntry[] = [];

  for (const match of matches) {
    entries.push({
      source: "skills.sh",
      repo: match[1],
      githubUrl: `https://github.com/${match[1]}`,
      skillId: match[2],
      name: match[3],
      installs: Number.parseInt(match[4], 10),
    });

    if (entries.length >= limit) {
      break;
    }
  }

  return entries;
}

export function parseHuggingFaceRepositoryPage(
  html: string,
  limit = 20,
): RemoteMarketEntry[] {
  const matches = html.matchAll(HUGGING_FACE_REPOSITORY_RE);
  const entries: RemoteMarketEntry[] = [];

  for (const match of matches) {
    entries.push({
      source: "huggingface",
      repo: "huggingface/skills",
      githubUrl: "https://github.com/huggingface/skills",
      skillId: match[1],
      name: match[2],
      installs: Number.parseInt(match[3], 10),
    });

    if (entries.length >= limit) {
      break;
    }
  }

  return entries;
}

function stripHtml(value: string): string {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/&#x3C;/g, "<")
    .replace(/&#x26;/g, "&")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

export function parseMarketDetailPage(html: string): RemoteMarketDetail {
  const installMatch = html.match(/<code[^>]*class="truncate"[^>]*>[\s\S]*?<\/code>/);
  const installCommand = installMatch ? stripHtml(installMatch[0]).replace(/^\$\s*/, "") : null;

  const summaryMatch = html.match(
    /<div class="prose[^"]*"[^>]*>[\s\S]*?<p>([\s\S]*?)<\/p>/,
  );
  const summary = summaryMatch ? stripHtml(summaryMatch[1]) : null;

  return {
    summary,
    installCommand,
  };
}
