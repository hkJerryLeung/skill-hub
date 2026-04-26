import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const sidebarSource = readFileSync(
  new URL("../src/components/Sidebar/Sidebar.tsx", import.meta.url),
  "utf8",
);
const marketViewSource = readFileSync(
  new URL("../src/components/MarketView/MarketView.tsx", import.meta.url),
  "utf8",
);

const discoverItemsMatch = sidebarSource.match(/const DISCOVER_ITEMS[\s\S]*?\];/);
assert.ok(discoverItemsMatch, "Expected Sidebar to define Discover items");
assert.match(
  discoverItemsMatch[0],
  /\{ key: "AI Skill Scout", label: "AI Skill Scout"/,
  "Expected AI Skill Scout to be listed in Discover",
);
assert.ok(
  discoverItemsMatch[0].indexOf("AI Skill Scout") < discoverItemsMatch[0].indexOf("huggingface"),
  "Expected AI Skill Scout to be the first Discover item",
);

assert.match(
  marketViewSource,
  /localScoutModels/,
  "Expected MarketView to accept detected local model options",
);
assert.match(
  marketViewSource,
  /Ask local model/,
  "Expected AI Skill Scout to render a chat submit action",
);
assert.match(
  marketViewSource,
  /Install to Shared Library/,
  "Expected AI Skill Scout recommendations to install into Shared Library",
);

console.log("aiSkillScoutMarkup test passed");
