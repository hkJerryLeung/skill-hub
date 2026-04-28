import assert from "node:assert/strict";
import {
  buildSkillPurposeComparison,
} from "../src/lib/skillPurposePresentation.ts";

const baseSkill = {
  name: "unknown-helper",
  description: "Use when working with React components and frontend UI.",
  path: "/tmp/unknown-helper",
  canonical_path: "/tmp/unknown-helper",
  agent: "Codex",
  is_symlink: false,
  category: null,
  category_assignment_mode: null,
  category_confidence: null,
  category_classified_at: null,
  version: null,
  source: null,
};

const known = buildSkillPurposeComparison({
  ...baseSkill,
  name: "editable-psd-rebuilder",
  description:
    "Rebuild a flattened poster, thumbnail, or social graphic into a layered PSD.",
});

assert.equal(
  known.summary,
  "把扁平海報、縮圖或社群圖重建成可在 Photoshop 修改的 PSD。",
);
assert.match(
  known.before,
  /只有一張合成後的扁平圖片/,
);
assert.match(
  known.before,
  /想改標題、人物或背景時只能重做/,
);
assert.match(
  known.after,
  /拆成背景、人物、裝飾與可編輯文字圖層/,
);
assert.match(
  known.after,
  /可以直接在 Photoshop 裡改字與調整版面/,
);

const chinese = buildSkillPurposeComparison({
  ...baseSkill,
  name: "humanizer-zh",
  description: "去除文本中的 AI 生成痕跡，讓文字更自然。",
});

assert.equal(
  chinese.summary,
  "把中文內容改得更自然，減少明顯 AI 生成痕跡。",
);
assert.match(chinese.before, /文字常有 AI 腔/);
assert.match(chinese.before, /連接詞過多或語氣太整齊/);
assert.match(chinese.after, /語氣變得更像真人寫作/);
assert.match(chinese.after, /保留原意但讀起來更順/);

const unknown = buildSkillPurposeComparison(baseSkill);

assert.equal(
  unknown.summary,
  "協助把前端介面需求整理成可實作的 React UI。",
);
assert.match(unknown.before, /畫面需求分散在描述或截圖中/);
assert.match(unknown.before, /元件狀態與互動細節還不清楚/);
assert.match(unknown.after, /整理出可落地的 React 元件/);
assert.match(unknown.after, /包含版面、狀態與互動行為/);
assert.doesNotMatch(unknown.before, /^Use when/);
assert.doesNotMatch(unknown.after, /^Use when/);

console.log("skillPurposePresentation test passed");
