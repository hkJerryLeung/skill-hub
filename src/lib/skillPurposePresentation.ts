import type { SkillInfo } from "./skillTypes";

interface SkillPurposeComparison {
  summary: string;
  before: string;
  after: string;
}

type SkillPurposeInput = Pick<SkillInfo, "name" | "description" | "category">;

interface PurposeRule {
  pattern: RegExp;
  summary: string;
  before: string;
  after: string;
}

const DEFAULT_COMPARISON: SkillPurposeComparison = {
  summary: "把特定工作流程整理成 agent 可以穩定執行的步驟。",
  before: "工作依賴臨場判斷，需求、輸入與檢查方式沒有固定下來，結果容易每次不同。",
  after: "套用 skill 後，agent 會按固定流程讀取資料、處理任務並檢查結果，輸出更一致。",
};

const KNOWN_COMPARISONS_ZH = new Map<string, SkillPurposeComparison>([
  [
    "editable-psd-rebuilder",
    {
      summary: "把扁平海報、縮圖或社群圖重建成可在 Photoshop 修改的 PSD。",
      before: "只有一張合成後的扁平圖片，文字、人物、背景和裝飾都黏在一起，想改標題、人物或背景時只能重做。",
      after: "拆成背景、人物、裝飾與可編輯文字圖層，保留原本構圖，同時可以直接在 Photoshop 裡改字與調整版面。",
    },
  ],
  [
    "humanizer-zh",
    {
      summary: "把中文內容改得更自然，減少明顯 AI 生成痕跡。",
      before: "文字常有 AI 腔，連接詞過多或語氣太整齊，句子生硬，讀者會覺得像機器生成。",
      after: "語氣變得更像真人寫作，保留原意但讀起來更順，同時讓句子節奏更自然。",
    },
  ],
  [
    "wwt-design-guidelines",
    {
      summary: "讓 WWT Electron app 的介面符合品牌與元件規範。",
      before: "新增或修改 React 介面時，顏色、間距、圓角、圖示和暗色層級容易各做各的。",
      after: "介面會使用 WWT token、品牌紅限制、既有圖示與元件模式，整體視覺更一致。",
    },
  ],
  [
    "wwt-service-cover-production",
    {
      summary: "製作 WWT 黑白紅復古紙 collage 風格的封面視覺。",
      before: "只有服務概念、地點或產品素材，畫面還像普通配圖，缺少 WWT 的紅黑白品牌語言。",
      after: "輸出帶有紙張拼貼、黑白紅對比與 WWT 視覺節奏的封面，可用於服務頁、活動或 campaign。",
    },
  ],
  [
    "imagegen",
    {
      summary: "根據需求產生或修改照片、插畫、縮圖與 mockup。",
      before: "只有文字想法、參考圖或半成品素材，還沒有符合尺寸、風格或用途的圖片。",
      after: "產出可直接放進介面、簡報、縮圖或設計稿的點陣圖片，必要時可再做變體。",
    },
  ],
  [
    "openai-docs",
    {
      summary: "用 OpenAI 官方文件確認 API、模型與升級做法。",
      before: "不確定目前文件是否改版，模型名稱、參數或最佳做法可能已經過期。",
      after: "先查官方來源，再給出可落地的 API 寫法、模型選擇或 prompt 升級建議。",
    },
  ],
  [
    "plugin-creator",
    {
      summary: "建立 Codex plugin 的資料夾、metadata 與發布骨架。",
      before: "plugin 需要的 `.codex-plugin`、manifest、技能目錄或 marketplace metadata 還未整理。",
      after: "產生符合 Codex 結構的 plugin 骨架，後續可以補實作、測試或發布。",
    },
  ],
  [
    "skill-creator",
    {
      summary: "把專門流程與領域知識整理成可重用的 Codex skill。",
      before: "工作方法散在對話、文件或個人習慣裡，agent 每次都要重新理解。",
      after: "整理成清楚的 SKILL.md，包含觸發條件、步驟與驗證方式，agent 可重複使用。",
    },
  ],
  [
    "skill-installer",
    {
      summary: "從 curated 清單或 GitHub 安裝 Codex skills。",
      before: "需要手動找 skill 來源、確認 repo 路徑，再決定放到哪個 Codex skill 目錄。",
      after: "按指定來源安裝到正確位置，讓新的 skill 能被 Codex 偵測與使用。",
    },
  ],
  [
    "documents",
    {
      summary: "建立、編輯、批註並檢查 Word / DOCX 文件。",
      before: "文件內容、格式、批註或紅線需要手動處理，版面是否正確也不容易確認。",
      after: "DOCX 被修改後會渲染成頁面圖片檢查，內容與版面都更接近可交付狀態。",
    },
  ],
  [
    "presentations",
    {
      summary: "建立、修改、渲染並匯出 PowerPoint 簡報。",
      before: "內容、圖片和版面分散，投影片還沒有形成完整敘事或一致視覺。",
      after: "生成或修改 PPTX，並透過渲染檢查每頁排版，方便直接交付或再微調。",
    },
  ],
  [
    "spreadsheets",
    {
      summary: "整理 Excel、CSV、公式、圖表與資料分析結果。",
      before: "原始資料可能分散在表格或 CSV，公式、格式、圖表和檢查邏輯都要手動處理。",
      after: "得到整理好的工作表、計算公式、格式化表格與圖表，並可重新計算驗證。",
    },
  ],
]);

const PURPOSE_RULES: PurposeRule[] = [
  {
    pattern: /\b(react|next\.?js|frontend|ui|component|interface|user experience)\b/i,
    summary: "協助把前端介面需求整理成可實作的 React UI。",
    before: "畫面需求分散在描述或截圖中，元件狀態與互動細節還不清楚，容易做出不完整 UI。",
    after: "整理出可落地的 React 元件，包含版面、狀態與互動行為，並貼近現有設計系統。",
  },
  {
    pattern: /\b(psd|photoshop|poster|thumbnail|social graphic|image|photo|visual|cover|sprite|mockup)\b/i,
    summary: "把概念、參考圖或半成品整理成可用視覺素材。",
    before: "只有概念、草圖或原始圖片，尺寸、風格與用途還不統一，視覺不能直接交付。",
    after: "整理成可使用的圖片、縮圖、海報或品牌視覺，並保留後續調整空間。",
  },
  {
    pattern: /\b(docx|word|document|pdf|redline|comment)\b/i,
    summary: "協助建立、編輯與檢查文件內容和版面。",
    before: "文件內容、批註、紅線或格式還需要手動整理，容易漏掉版面問題。",
    after: "文件完成編輯、審閱與渲染檢查，內容和排版更接近可交付版本。",
  },
  {
    pattern: /\b(ppt|pptx|slide|presentation|deck)\b/i,
    summary: "把內容與素材整理成完整 PowerPoint 簡報。",
    before: "簡報素材分散，頁面順序、視覺層級或版面細節還未完成。",
    after: "產出可檢查、可匯出的完整簡報，並能針對每頁版面再修正。",
  },
  {
    pattern: /\b(spreadsheet|excel|xlsx|csv|tsv|table|chart|data)\b/i,
    summary: "整理表格資料、公式、圖表與分析流程。",
    before: "資料、公式、欄位格式或圖表仍需手動清理，分析結果不易重算或驗證。",
    after: "得到整理好的表格、公式、圖表或分析結果，並能用固定流程重新檢查。",
  },
  {
    pattern: /\b(skill|plugin|install|scaffold|marketplace)\b/i,
    summary: "協助建立、安裝或整理 agent skill 與 plugin。",
    before: "skill 或 plugin 的來源、結構、metadata 與安裝位置不清楚，容易裝錯或漏檔。",
    after: "完成建立、安裝或整理後，agent 能在正確目錄偵測並直接使用。",
  },
  {
    pattern: /\b(test|debug|bug|verify|review|refactor|implementation|plan)\b/i,
    summary: "把開發、除錯、審查或驗證流程變得更有依據。",
    before: "需求、bug 或改動風險還沒有被拆解，可能只靠直覺改 code。",
    after: "有清楚步驟、測試、檢查點與驗證結果支撐改動，降低回歸風險。",
  },
  {
    pattern: /\b(write|writing|copy|text|translation|humanize|prompt)\b/i,
    summary: "協助撰寫、改寫、翻譯或優化提示詞與文案。",
    before: "文字草稿、翻譯或提示詞還不夠自然、精準，語氣可能不符合情境。",
    after: "文字變得更清楚、自然且貼近用途，讀者更容易理解下一步。",
  },
];

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeKnownKey(name: string): string {
  return name.trim().toLowerCase();
}

function getKnownComparison(skill: SkillPurposeInput): SkillPurposeComparison | null {
  return KNOWN_COMPARISONS_ZH.get(normalizeKnownKey(skill.name)) ?? null;
}

function getRuleBasedComparison(
  skill: SkillPurposeInput,
  description: string,
): SkillPurposeComparison | null {
  const source = `${skill.name} ${skill.category ?? ""} ${description}`;
  const rule = PURPOSE_RULES.find((candidate) => candidate.pattern.test(source));
  return rule
    ? {
        summary: rule.summary,
        before: rule.before,
        after: rule.after,
      }
    : null;
}

export function buildSkillPurposeComparison(
  skill: SkillPurposeInput,
): SkillPurposeComparison {
  const description = normalizeText(skill.description);
  const knownComparison = getKnownComparison(skill);
  if (knownComparison) {
    return knownComparison;
  }

  return getRuleBasedComparison(skill, description) ?? DEFAULT_COMPARISON;
}
