import assert from "node:assert/strict";
import { resolveMigrationBatch } from "../src/lib/dragDropState.ts";

const skills = [
  { path: "/skills/a", agent: "Claude Code" },
  { path: "/skills/b", agent: "Codex" },
  { path: "/skills/c", agent: "Shared Library" },
];

const draggedPriority = resolveMigrationBatch({
  draggedBatch: [skills[0], skills[1]],
  selectedIds: new Set(["/skills/c"]),
  skills,
  getSkillId: (skill) => skill.path,
  targetKey: "Codex",
  allowSelectedFallback: true,
});

assert.deepStrictEqual(
  draggedPriority.batch.map((skill) => skill.path),
  ["/skills/a", "/skills/b"],
);
assert.deepStrictEqual(
  draggedPriority.movableBatch.map((skill) => skill.path),
  ["/skills/a"],
);

const selectedFallback = resolveMigrationBatch({
  draggedBatch: [],
  selectedIds: new Set(["/skills/a", "/skills/c"]),
  skills,
  getSkillId: (skill) => skill.path,
  targetKey: "Shared Library",
  allowSelectedFallback: true,
});

assert.deepStrictEqual(
  selectedFallback.batch.map((skill) => skill.path),
  ["/skills/a", "/skills/c"],
);
assert.deepStrictEqual(
  selectedFallback.movableBatch.map((skill) => skill.path),
  ["/skills/a"],
);

const noFallback = resolveMigrationBatch({
  draggedBatch: [],
  selectedIds: new Set(["/skills/a", "/skills/c"]),
  skills,
  getSkillId: (skill) => skill.path,
  targetKey: "Shared Library",
  allowSelectedFallback: false,
});

assert.deepStrictEqual(noFallback.batch, []);
assert.deepStrictEqual(noFallback.movableBatch, []);

console.log("migrationBatch test passed");
