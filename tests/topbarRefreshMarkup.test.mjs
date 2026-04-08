import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const topbarSource = readFileSync(
  new URL("../src/components/Topbar/Topbar.tsx", import.meta.url),
  "utf8",
);
const [topbarRowSource, statsBarSource] = topbarSource.split(
  '<div className="stats-bar">',
);

assert.ok(statsBarSource, "Expected Topbar to render a stats bar section");
assert.match(
  statsBarSource,
  /stats-refresh-btn[\s\S]*onClick=\{onRefresh\}/,
  "Expected refresh button to live inside the stats bar",
);
assert.doesNotMatch(
  topbarRowSource,
  /stats-refresh-btn/,
  "Refresh button should not be rendered in the top row",
);
assert.match(
  statsBarSource,
  /Category Filter/,
  "Expected Shared Library stats bar to render a category filter trigger",
);
assert.match(
  topbarSource,
  /selectedSharedCategories/,
  "Expected Topbar props to accept selected shared categories",
);
assert.doesNotMatch(
  topbarSource,
  /sharedCategoryLabel/,
  "Topbar should stop using the breadcrumb category label prop",
);
assert.doesNotMatch(
  topbarSource,
  /Shared Library \/ \$\{sharedCategoryLabel\}/,
  "Topbar title should stay on Shared Library instead of breadcrumbing category navigation",
);

const iconsSource = readFileSync(
  new URL("../src/components/Icons/Icons.tsx", import.meta.url),
  "utf8",
);

assert.match(
  iconsSource,
  /export const RefreshIcon[\s\S]*viewBox="0 0 24 24"/,
  "Refresh icon should use the 24x24 circular refresh glyph",
);
assert.match(
  iconsSource,
  /M17\.65 6\.35A8 8 0 1 0 20 12/,
  "Refresh icon should use the circular arrow path",
);

console.log("topbarRefreshMarkup test passed");
