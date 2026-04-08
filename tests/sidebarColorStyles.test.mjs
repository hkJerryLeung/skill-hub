import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const sidebarCss = readFileSync(
  new URL("../src/components/Sidebar/Sidebar.css", import.meta.url),
  "utf8",
);

assert.match(
  sidebarCss,
  /\.sidebar-label\s*\{[\s\S]*color:\s*var\(--text-muted\);/,
  "Section labels should keep the muted label color",
);

assert.match(
  sidebarCss,
  /\.sidebar-item\s*\{[\s\S]*color:\s*var\(--text-primary\);/,
  "Sidebar items should use white primary text",
);

assert.match(
  sidebarCss,
  /\.sidebar-item\.active\s*\{[\s\S]*color:\s*var\(--text-primary\);/,
  "Active sidebar items should also stay white",
);

console.log("sidebarColorStyles test passed");
