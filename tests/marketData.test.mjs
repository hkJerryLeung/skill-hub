import assert from "node:assert/strict";
import {
  parseHuggingFaceRepositoryPage,
  parseMarketDetailPage,
  parseSkillsShLeaderboard,
} from "../src/lib/remoteMarketData.ts";

const leaderboardHtml = String.raw`
  <script>
    self.__next_f.push([1,"{\"source\":\"vercel-labs/skills\",\"skillId\":\"find-skills\",\"name\":\"find-skills\",\"installs\":774900},{\"source\":\"inferen-sh/skills\",\"skillId\":\"prompt-engineering\",\"name\":\"prompt-engineering\",\"installs\":7537}]"])
  </script>
`;

assert.deepEqual(parseSkillsShLeaderboard(leaderboardHtml, 2), [
  {
    source: "skills.sh",
    repo: "vercel-labs/skills",
    githubUrl: "https://github.com/vercel-labs/skills",
    skillId: "find-skills",
    name: "find-skills",
    installs: 774900,
  },
  {
    source: "skills.sh",
    repo: "inferen-sh/skills",
    githubUrl: "https://github.com/inferen-sh/skills",
    skillId: "prompt-engineering",
    name: "prompt-engineering",
    installs: 7537,
  },
]);

const huggingFaceHtml = String.raw`
  <a class="group" href="/huggingface/skills/hf-cli">
    <div><h3>hf-cli</h3></div>
    <div><span>295</span></div>
  </a>
  <a class="group" href="/huggingface/skills/huggingface-datasets">
    <div><h3>huggingface-datasets</h3></div>
    <div><span>106</span></div>
  </a>
`;

assert.deepEqual(parseHuggingFaceRepositoryPage(huggingFaceHtml, 2), [
  {
    source: "huggingface",
    repo: "huggingface/skills",
    githubUrl: "https://github.com/huggingface/skills",
    skillId: "hf-cli",
    name: "hf-cli",
    installs: 295,
  },
  {
    source: "huggingface",
    repo: "huggingface/skills",
    githubUrl: "https://github.com/huggingface/skills",
    skillId: "huggingface-datasets",
    name: "huggingface-datasets",
    installs: 106,
  },
]);

const detailHtml = String.raw`
  <button>
    <code class="truncate"><span class="opacity-50">$</span> <!-- -->npx skills add https://github.com/vercel-labs/skills --skill find-skills</code>
  </button>
  <div class="prose prose-invert max-w-none">
    <p><strong>Discover and install specialized agent skills from the open ecosystem when users need extended capabilities.</strong></p>
    <ul><li>extra</li></ul>
  </div>
`;

assert.deepEqual(parseMarketDetailPage(detailHtml), {
  summary:
    "Discover and install specialized agent skills from the open ecosystem when users need extended capabilities.",
  installCommand: "npx skills add https://github.com/vercel-labs/skills --skill find-skills",
});

console.log("marketData test passed");
