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
  /\{ key: "AI Install", label: "AI Install"/,
  "Expected AI Install to be listed in Discover",
);
assert.ok(
  discoverItemsMatch[0].indexOf("AI Install") < discoverItemsMatch[0].indexOf("Install via GitHub"),
  "Expected AI Install to be the first Discover item",
);
assert.doesNotMatch(
  discoverItemsMatch[0],
  /huggingface|skills\.sh|skillsmp\.com|skillsmap\.com/,
  "Expected external market sources to be removed from Discover",
);

assert.match(
  marketViewSource,
  /localScoutModels/,
  "Expected MarketView to accept detected local model options",
);
assert.match(
  marketViewSource,
  /ai-install-composer/,
  "Expected AI Install to render a chat-style composer",
);
assert.match(
  marketViewSource,
  /Model settings/,
  "Expected AI Install to expose model settings from the top-right action",
);
assert.match(
  marketViewSource,
  /ai-install-settings-dialog/,
  "Expected AI Install model settings to render in a dialog",
);
assert.match(
  marketViewSource,
  /Install to Shared Library/,
  "Expected AI Install recommendations to install into Shared Library",
);

console.log("aiSkillScoutMarkup test passed");
